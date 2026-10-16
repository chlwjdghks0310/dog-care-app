import AVFoundation
import CoreVideo
import VideoToolbox
// usage: greenkey <in.mp4> <out-basename> <size>
//   초록 배경으로 다시 만든 영상(Kling "배경만 초록으로")에서 배경을 지운다. bakealpha와 같은 두 가지를 출력:
//   → <out-basename>.mov : HEVC + 알파(사파리/iOS가 그대로 투명 재생)
//   → <out-basename>.mp4 : 같은 알파를 순수 초록(0,255,0)과 섞은 H.264(크롬 등에서 캔버스 키잉용)
//
// 알파: 초록 우세도 e = G - max(R, B). 강아지 털(검정·흰색·크림·갈색)은 e ≈ 0, 배경은 크다.
//   픽셀 = a·털 + (1-a)·배경 이므로 a = 1 - e / (배경의 e). 털 가닥·꼬리 모션블러가 자연스럽게 반투명이 된다.
// 그림자: 바닥 그림자도 "어두운 초록"이라 e가 중간값 → 털과 이어진 가장자리(EDGE px) 밖의 반투명은 배경으로 지운다.
// 색: 반투명 픽셀은 배경색을 빼서(unmix) 원래 털 색을 복원하고, 모든 픽셀에서 초록 번짐을 뺀다(G ≤ max(R, B)).
let a = CommandLine.arguments
let src = AVURLAsset(url: URL(fileURLWithPath: a[1])); let base = a[2]; let S = Int(a[3])!
let env = ProcessInfo.processInfo.environment
let EDGE = Int(env["EDGE"] ?? "") ?? 6        // 단단한 털에서 이 거리(px)보다 먼 반투명은 그림자로 보고 지움
let SOLID = Double(env["SOLID"] ?? "") ?? 0.8, CLEAR = Double(env["CLEAR"] ?? "") ?? 0.25 // 이보다 크면 완전 불투명 / 작으면 완전 투명 — 사이는 늘려서 씀(가장자리를 얇고 또렷하게)
let RIM = Int(env["RIM"] ?? "") ?? 6
let wm = (x: 0.715, y: 0.945)                 // Kling 워터마크 자리(우측 하단) — 무조건 투명

struct Frame { let w: Int; let h: Int; var rgb: [UInt8] }

func readFrames() async throws -> (frames: [Frame], times: [CMTime], fps: Float) {
  let track = try await src.loadTracks(withMediaType: .video)[0]
  let fps = try await track.load(.nominalFrameRate); let natural = try await track.load(.naturalSize); let duration = try await src.load(.duration)
  let reader = try AVAssetReader(asset: src)
  let comp = AVMutableVideoComposition(); comp.renderSize = CGSize(width: S, height: S); comp.frameDuration = CMTime(value: 1, timescale: CMTimeScale(fps.rounded()))
  let inst = AVMutableVideoCompositionInstruction(); inst.timeRange = CMTimeRange(start: .zero, duration: duration)
  let li = AVMutableVideoCompositionLayerInstruction(assetTrack: track)
  li.setTransform(CGAffineTransform(scaleX: CGFloat(S) / natural.width, y: CGFloat(S) / natural.height), at: .zero)
  inst.layerInstructions = [li]; comp.instructions = [inst]
  let out = AVAssetReaderVideoCompositionOutput(videoTracks: [track], videoSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
  out.videoComposition = comp; reader.add(out); reader.startReading()
  var frames: [Frame] = [], times: [CMTime] = []
  while let sb = out.copyNextSampleBuffer() {
    let pb = CMSampleBufferGetImageBuffer(sb)!; CVPixelBufferLockBaseAddress(pb, .readOnly)
    let w = CVPixelBufferGetWidth(pb), h = CVPixelBufferGetHeight(pb), rb = CVPixelBufferGetBytesPerRow(pb)
    let px = CVPixelBufferGetBaseAddress(pb)!.assumingMemoryBound(to: UInt8.self)
    var rgb = [UInt8](repeating: 0, count: w * h * 3)
    for y in 0..<h { for x in 0..<w { let i = y * rb + x * 4, o = (y * w + x) * 3; rgb[o] = px[i + 2]; rgb[o + 1] = px[i + 1]; rgb[o + 2] = px[i] } }
    CVPixelBufferUnlockBaseAddress(pb, .readOnly)
    frames.append(Frame(w: w, h: h, rgb: rgb)); times.append(CMSampleBufferGetPresentationTimeStamp(sb))
  }
  return (frames, times, fps)
}

func median(_ v: [Double]) -> Double { let s = v.sorted(); return s.isEmpty ? 0 : s[s.count / 2] }

func key(_ f: Frame) -> (alpha: [Double], rgb: [UInt8]) {
  let w = f.w, h = f.h, n = w * h
  func e(_ p: Int) -> Double { Double(f.rgb[p * 3 + 1]) - Double(max(f.rgb[p * 3], f.rgb[p * 3 + 2])) }
  // 배경 기준값: 확실한 배경(초록 우세 큰 픽셀)의 중앙값. 배경은 위아래로 밝기가 조금 달라 행 띠(8개)마다 따로 잰다.
  let bands = 8
  var bandE = [Double](repeating: 0, count: bands), bandC = [[Double]](repeating: [0, 0, 0], count: bands)
  for b in 0..<bands {
    var es: [Double] = [], cs: [[Double]] = [[], [], []]
    for y in stride(from: b * h / bands, to: (b + 1) * h / bands, by: 2) { for x in stride(from: 0, to: w, by: 2) { let p = y * w + x
      if e(p) > 45 { es.append(e(p)); for c in 0..<3 { cs[c].append(Double(f.rgb[p * 3 + c])) } } } }
    bandE[b] = max(40, median(es)); bandC[b] = cs.map(median) }
  var al = [Double](repeating: 0, count: n)
  for p in 0..<n { let b = min(bands - 1, (p / w) * bands / h)
    let v = 1 - max(0, e(p)) / bandE[b]
    al[p] = min(1, max(0, (v - CLEAR) / (SOLID - CLEAR))) }
  // 그림자 제거: 불투명 털에서 EDGE px 안쪽의 반투명만 남긴다
  var dist = [Int](repeating: Int.max, count: n); var q: [Int] = []
  for p in 0..<n where al[p] >= 1 { dist[p] = 0; q.append(p) }
  var hd = 0
  while hd < q.count { let p = q[hd]; hd += 1; if dist[p] >= EDGE { continue }; let x = p % w
    for r in [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w] where r >= 0 && r < n && dist[r] == Int.max { dist[r] = dist[p] + 1; q.append(r) } }
  for p in 0..<n where dist[p] > EDGE { al[p] = 0 }
  for y in Int(Double(h) * wm.y)..<h { for x in Int(Double(w) * wm.x)..<w { al[y * w + x] = 0 } }
  var near = [Int](repeating: -1, count: n); var q2: [Int] = []
  for p in 0..<n where al[p] >= 1 { near[p] = p; q2.append(p) }
  var h2 = 0
  while h2 < q2.count { let p = q2[h2]; h2 += 1; let x = p % w
    for r in [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w] where r >= 0 && r < n && near[r] < 0 && al[r] > 0 { near[r] = near[p]; q2.append(r) } }
  // 가장자리 띠(투명에서 RIM px 안쪽)는 Kling이 털 끝에 초록을 섞어 올리브색이 돼 있다
  var rim = [Int](repeating: Int.max, count: n); var q3: [Int] = []
  for p in 0..<n where al[p] < 1 { rim[p] = 0; q3.append(p) }
  var h3 = 0
  while h3 < q3.count { let p = q3[h3]; h3 += 1; if rim[p] >= RIM { continue }; let x = p % w
    for r in [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w] where r >= 0 && r < n && rim[r] == Int.max { rim[r] = rim[p] + 1; q3.append(r) } }
  var inner = [Int](repeating: -1, count: n); var q4: [Int] = []  // 가장자리 띠 밖(안쪽)에서 가장 가까운 털 픽셀
  for p in 0..<n where rim[p] > RIM { inner[p] = p; q4.append(p) }
  var h4 = 0
  while h4 < q4.count { let p = q4[h4]; h4 += 1; let x = p % w
    for r in [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w] where r >= 0 && r < n && inner[r] < 0 && al[r] > 0 { inner[r] = inner[p]; q4.append(r) } }
  // 색 복원 + 초록 번짐 제거
  var out = f.rgb
  for p in 0..<n where al[p] > 0 { let B = bandC[min(bands - 1, (p / w) * bands / h)], A = al[p]
    var c = (0..<3).map { Double(f.rgb[p * 3 + $0]) }
    // 많이 투명한 픽셀은 배경을 빼는 계산이 불안정해(초록·회색 얼룩) 가장 가까운 불투명 털 색을 쓴다
    if A < 1 { c = A >= 0.6 || near[p] < 0 ? (0..<3).map { (c[$0] - (1 - A) * B[$0]) / A } : (0..<3).map { Double(f.rgb[near[p] * 3 + $0]) } }
    if rim[p] <= RIM, inner[p] >= 0 {  // 가장자리 띠: 안쪽 털의 색조 + 이 픽셀의 밝기(초록이 섞인 색 대신 진짜 털 색)
      let ic = (0..<3).map { Double(f.rgb[inner[p] * 3 + $0]) }
      let lum = { (v: [Double]) in 0.3 * v[0] + 0.59 * min(v[1], max(v[0], v[2])) + 0.11 * v[2] }
      let k = min(1.15, max(0.85, lum(c) / max(1, lum(ic)))) // 초록이 섞여 어두워진 테두리가 회색 선처럼 보이지 않게 밝기 차이는 조금만
      c = ic.map { $0 * k } }
    c[1] = min(c[1], max(c[0], c[2]))
    for i in 0..<3 { out[p * 3 + i] = UInt8(max(0, min(255, c[i].rounded()))) } }
  return (al, out)
}

let sema = DispatchSemaphore(value: 0)
Task {
  let (frames, times, fps) = try await readFrames()
  let w = frames[0].w, h = frames[0].h
  let keyed = frames.map(key)
  func writer(_ url: URL, _ type: AVFileType, _ settings: [String: Any]) throws -> (AVAssetWriter, AVAssetWriterInputPixelBufferAdaptor) {
    try? FileManager.default.removeItem(at: url)
    let wr = try AVAssetWriter(outputURL: url, fileType: type)
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
    let ad = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: w, kCVPixelBufferHeightKey as String: h])
    wr.add(input); wr.startWriting(); wr.startSession(atSourceTime: .zero); return (wr, ad) }
  let (wA, aA) = try writer(URL(fileURLWithPath: base + ".mov"), .mov, [AVVideoCodecKey: AVVideoCodecType.hevcWithAlpha, AVVideoWidthKey: w, AVVideoHeightKey: h,
    AVVideoCompressionPropertiesKey: [AVVideoQualityKey: 0.7, kVTCompressionPropertyKey_TargetQualityForAlpha as String: 0.9]])
  let (wG, aG) = try writer(URL(fileURLWithPath: base + ".mp4"), .mp4, [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: w, AVVideoHeightKey: h,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 1_400_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel]])
  for i in 0..<keyed.count {
    let (alpha, rgb) = keyed[i]
    for (ad, green) in [(aA, false), (aG, true)] {
      var pbOut: CVPixelBuffer?; CVPixelBufferPoolCreatePixelBuffer(nil, ad.pixelBufferPool!, &pbOut); let pb = pbOut!
      CVPixelBufferLockBaseAddress(pb, []); let rb = CVPixelBufferGetBytesPerRow(pb)
      let px = CVPixelBufferGetBaseAddress(pb)!.assumingMemoryBound(to: UInt8.self)
      for y in 0..<h { for x in 0..<w { let p = y * w + x, o = y * rb + x * 4, al = alpha[p]
        let r = Double(rgb[p * 3]), g = Double(rgb[p * 3 + 1]), b = Double(rgb[p * 3 + 2])
        if green { px[o] = UInt8(b * al); px[o + 1] = UInt8(g * al + 255 * (1 - al)); px[o + 2] = UInt8(r * al); px[o + 3] = 255 }
        else { px[o] = UInt8(b * al); px[o + 1] = UInt8(g * al); px[o + 2] = UInt8(r * al); px[o + 3] = UInt8(al * 255) } } } // 알파는 premultiplied
      CVPixelBufferUnlockBaseAddress(pb, [])
      while !ad.assetWriterInput.isReadyForMoreMediaData { usleep(1000) }
      ad.append(pb, withPresentationTime: times[i]) }
  }
  for wr in [wA, wG] { wr.inputs.forEach { $0.markAsFinished() }; await wr.finishWriting() }
  print(wA.status == .completed && wG.status == .completed ? "ok \(keyed.count) frames @\(fps)fps" : "fail \(String(describing: wA.error)) \(String(describing: wG.error))")
  sema.signal()
}
sema.wait()
