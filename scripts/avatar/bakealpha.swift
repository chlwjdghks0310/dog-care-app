import AVFoundation
import CoreVideo
import VideoToolbox
// usage: bakealpha <in.mp4> <out-basename> <size>
//   → <out-basename>.mov : HEVC + 알파(투명 배경). 사파리/iOS가 그대로 투명하게 재생 — 앱에서 색으로 지울 필요 없음.
//   → <out-basename>.mp4 : 같은 알파를 초록(0,255,0)과 섞은 H.264. 알파 영상을 못 쓰는 브라우저(크롬 등)용.
//
// 배경 찾기: 테두리에 이어진 "배경색 비슷한" 픽셀(flood). 기준은 프레임마다 테두리 배경의 밝기·채도 중앙값에 맞춘다.
//   위쪽은 엄격하게(흰 털이 배경에 닿아도 안 넘어가게), 아래 22%(바닥 그림자)는 느슨하게. 작은 얼룩은 배경으로.
// 알파: 포메라니안처럼 픽셀마다 "배경판과 다른 정도"를 부드러운 비율로(KEY_FROM~KEY_RANGE). 몸 안쪽(경계에서 PROTECT px 이상)은 항상 보임.
// 깜빡임 방지: 앞뒤 프레임 모두 보이는데 이번 프레임만 빠진 픽셀은 메운다(hole fill) — 얼굴 경계·꼬리가 한 프레임씩 사라지는 것 방지.
let a = CommandLine.arguments
let src = AVURLAsset(url: URL(fileURLWithPath: a[1])); let base = a[2]; let S = Int(a[3])!
let lo = 140.0, step = 10, floorStep = 16
let floorFrom = Double(ProcessInfo.processInfo.environment["FLOOR_FROM"] ?? "") ?? 0.78 // 바닥(그림자) 시작 높이 비율 — 캐릭터가 엎드려 그림자가 높으면 낮춘다
let wm = (x: 0.8, y: 0.93, w: 0.2, h: 0.08)
let SOFT_BAND = 40 // 캐릭터에서 이 거리(px)보다 먼 배경은 완전 투명
let PLATE_TOL = Double(ProcessInfo.processInfo.environment["PLATE_TOL"] ?? "") ?? 6.0, PLATE_TOL_FLOOR = max(12.0, PLATE_TOL) // 흰 털 없는 견종은 크게(14) — 밝은 배경 틈도 배경으로
let PROTECT = 4, KEY_FROM = 5.0, KEY_RANGE = 16.0

struct Frame { let w: Int; let h: Int; var rgb: [UInt8] }  // RGB packed, w*h*3

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

// 배경 마스크(true = 배경). 워터마크 자리는 배경 취급.
// plateRef가 있으면(2차) "그 자리의 실제 배경색(배경판 + 프레임 밝기)과 거의 같은 픽셀"만 배경 후보 → 흰 털이 배경과 밝기가 비슷해도 안 넘어감
func backgroundMask(_ f: Frame, plateRef: (plate: [Double], cnt: [Double])? = nil) -> (mask: [Bool], level: Double) {
  let w = f.w, h = f.h, n = w * h, floorStart = Int(Double(h) * floorFrom) * w
  var rgb = f.rgb
  // 워터마크 자리를 테두리 배경색으로 덮는다
  var bright: [Double] = [], sats: [Double] = [], cols: [(Int, Int, Int)] = []
  func at(_ p: Int) -> (Int, Int, Int) { (Int(rgb[p * 3]), Int(rgb[p * 3 + 1]), Int(rgb[p * 3 + 2])) }
  for p in Array(0..<w) + (0..<h).map({ $0 * w }) + (0..<h).map({ $0 * w + w - 1 }) {
    let (r, g, b) = at(p); let mx = max(r, g, b), mn = min(r, g, b)
    bright.append(Double(r + g + b) / 3); sats.append(mx == 0 ? 0 : Double(mx - mn) / Double(mx)); cols.append((r, g, b)) }
  let order = bright.indices.sorted { bright[$0] < bright[$1] }; let mid = cols[order[order.count / 2]]
  for y in Int(Double(h) * wm.y)..<h { for x in Int(Double(w) * wm.x)..<w { let p = y * w + x
    rgb[p * 3] = UInt8(mid.0); rgb[p * 3 + 1] = UInt8(mid.1); rgb[p * 3 + 2] = UInt8(mid.2) } }
  sats.sort()
  let B0 = bright[order[order.count / 2]], S0 = sats[sats.count / 2]
  let hi = B0 + 10, floorHi = B0 + 16, satMax = max(0.035, S0 + 0.03), floorSat = satMax + 0.025
  func isBg(_ p: Int) -> Bool {
    if let ref = plateRef {
      if ref.cnt[p] == 0 { return false }
      let px = at(p), tol = p >= floorStart ? PLATE_TOL_FLOOR : PLATE_TOL
      return abs(Double(px.0) - (ref.plate[p * 3] + B0)) <= tol && abs(Double(px.1) - (ref.plate[p * 3 + 1] + B0)) <= tol && abs(Double(px.2) - (ref.plate[p * 3 + 2] + B0)) <= tol }
    let (r, g, b) = at(p); let br = Double(r + g + b) / 3; let mx = max(r, g, b), mn = min(r, g, b)
    let sat = mx == 0 ? 0 : Double(mx - mn) / Double(mx); let fl = p >= floorStart
    return br >= lo && br <= (fl ? floorHi : hi) && sat <= (fl ? floorSat : satMax) }
  func close(_ p: Int, _ q: Int) -> Bool { let x = at(p), y = at(q)
    return abs(x.0 - y.0) + abs(x.1 - y.1) + abs(x.2 - y.2) <= (q >= floorStart ? floorStep : step) }
  var bg = [Bool](repeating: false, count: n); var stack: [Int] = []
  func seed(_ p: Int) { if !bg[p] && isBg(p) { bg[p] = true; stack.append(p) } }
  for x in 0..<w { seed(x); seed((h - 1) * w + x) }; for y in 0..<h { seed(y * w); seed(y * w + w - 1) }
  while let p = stack.popLast() { let x = p % w
    for q in [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w] where q >= 0 && q < n && !bg[q] && isBg(q) && close(p, q) { bg[q] = true; stack.append(q) } }
  // 캐릭터(가장 큰 덩어리)의 2%보다 작은 조각은 배경으로
  var label = [Int](repeating: 0, count: n); var sizes = [0]
  for s0 in 0..<n where !bg[s0] && label[s0] == 0 { let id = sizes.count; var size = 0; label[s0] = id; stack.append(s0)
    while let p = stack.popLast() { size += 1; let x = p % w
      for q in [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w] where q >= 0 && q < n && !bg[q] && label[q] == 0 { label[q] = id; stack.append(q) } }
    sizes.append(size) }
  let minKeep = Double(sizes.max() ?? 0) * 0.02
  for p in 0..<n where !bg[p] && Double(sizes[label[p]]) < minKeep { bg[p] = true }
  return (bg, B0)
}

let sema = DispatchSemaphore(value: 0)
Task {
  let (frames, times, fps) = try await readFrames()
  let w = frames[0].w, h = frames[0].h, n = w * h
  let results = frames.map { backgroundMask($0) }
  let masks = results.map { $0.mask }, levels = results.map { $0.level }

  // 배경판: 픽셀별로 "배경색 - 그 프레임 배경 밝기" 평균 → 클립마다 배경 밝기가 달라도 같은 판으로 비교 가능
  var plate = [Double](repeating: 0, count: n * 3), cnt = [Double](repeating: 0, count: n)
  for (i, (f, m)) in zip(frames, masks).enumerated() { for p in 0..<n where m[p] { for c in 0..<3 { plate[p * 3 + c] += Double(f.rgb[p * 3 + c]) - levels[i] }; cnt[p] += 1 } }
  for p in 0..<n where cnt[p] > 0 { for c in 0..<3 { plate[p * 3 + c] /= cnt[p] } }
  // 배경판을 픽셀별 평균으로 만들면, 캐릭터가 거의 항상 덮고 있는 자리(얼굴 뒤)는 털 색에 오염된다.
  // 배경은 매끈한 회색 그라데이션이므로 화면 전체에 2차 곡면(밝기)을 맞추고(이상치 제거 2회), 색조는 배경 전체의 중앙값을 쓴다.
  var sx: [Double] = [], sy: [Double] = [], sl: [Double] = [], sc: [[Double]] = [[], [], []]
  for (i, (f, m)) in zip(frames, masks).enumerated() where i % 3 == 0 {
    for y in stride(from: 0, to: h, by: 4) { for x in stride(from: 0, to: w, by: 4) { let p = y * w + x; if !m[p] { continue }
      let r = Double(f.rgb[p * 3]), g = Double(f.rgb[p * 3 + 1]), b = Double(f.rgb[p * 3 + 2]), l = (r + g + b) / 3
      sx.append(Double(x) / Double(w) - 0.5); sy.append(Double(y) / Double(h) - 0.5); sl.append(l - levels[i])
      sc[0].append(r - l); sc[1].append(g - l); sc[2].append(b - l) } } }
  func basis(_ x: Double, _ y: Double) -> [Double] { [1, x, y, x * x, x * y, y * y] }
  func solve(_ A: [[Double]], _ bv: [Double]) -> [Double] {  // 6x6 가우스 소거
    var M = A.enumerated().map { $0.element + [bv[$0.offset]] }; let k = bv.count
    for c in 0..<k { let piv = (c..<k).max { abs(M[$0][c]) < abs(M[$1][c]) }!; M.swapAt(c, piv)
      for r in 0..<k where r != c { let f = M[r][c] / M[c][c]; for cc in c...k { M[r][cc] -= f * M[c][cc] } } }
    return (0..<k).map { M[$0][k] / M[$0][$0] } }
  var keep = [Bool](repeating: true, count: sl.count); var coef = [Double](repeating: 0, count: 6)
  for _ in 0..<3 {
    var A = [[Double]](repeating: [Double](repeating: 0, count: 6), count: 6), bv = [Double](repeating: 0, count: 6)
    for t in sl.indices where keep[t] { let v = basis(sx[t], sy[t]); for r in 0..<6 { bv[r] += v[r] * sl[t]; for c in 0..<6 { A[r][c] += v[r] * v[c] } } }
    coef = solve(A, bv)
    for t in sl.indices { let v = basis(sx[t], sy[t]); let pred = (0..<6).reduce(0) { $0 + coef[$1] * v[$1] }; keep[t] = abs(sl[t] - pred) <= 6 } }
  let tint = sc.map { arr -> Double in let srt = arr.sorted(); return srt[srt.count / 2] }
  for y in 0..<h { for x in 0..<w { let p = y * w + x; let v = basis(Double(x) / Double(w) - 0.5, Double(y) / Double(h) - 0.5)
    let l = (0..<6).reduce(0) { $0 + coef[$1] * v[$1] }
    for c in 0..<3 { plate[p * 3 + c] = l + tint[c] }; cnt[p] = 1 } }
  // 2차: 배경판 기준으로 배경을 다시 찾는다
  let results2 = frames.map { backgroundMask($0, plateRef: (plate, cnt)) }
  // 바닥 영역(아래 22%)은 그림자가 매끈한 배경 모델에 안 맞으므로 1차 결과도 배경으로 인정한다.
  let floorStartRow = Int(Double(h) * floorFrom)
  let masks2 = (0..<frames.count).map { i in (0..<n).map { p in results2[i].mask[p] || (p / w >= floorStartRow && masks[i][p]) } }

  // 프레임별 알파(0~1)
  var alphas: [[Double]] = []
  var outRGB: [[UInt8]] = []  // 가장자리는 배경색을 빼낸(unmix) 털 색으로 바꿔 회색 테두리가 안 생기게
  for (fi, (f, bg)) in zip(frames, masks2).enumerated() {
    var dist = [Int](repeating: Int.max, count: n); var queue: [Int] = []
    for p in 0..<n where !bg[p] { dist[p] = 0; queue.append(p) }
    var head = 0
    while head < queue.count { let p = queue[head]; head += 1; if dist[p] >= SOFT_BAND { continue }; let x = p % w
      for q in [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w] where q >= 0 && q < n && dist[q] == Int.max { dist[q] = dist[p] + 1; queue.append(q) } }
    // 포메라니안 방식(픽셀마다 "배경과 얼마나 다른가"를 부드러운 비율로)으로 알파를 정하되,
    // 흰 털이 배경과 비슷한 몸 안쪽(경계에서 PROTECT px 이상 들어간 곳)만은 무조건 보이게 보호한다.
    // 장면마다 "경계선"을 새로 긋지 않으니 가장자리(귀·꼬리·털끝)가 프레임마다 들쭉날쭉 깨지지 않는다.
    var inDist = [Int](repeating: Int.max, count: n); var q2: [Int] = []
    for p in 0..<n where bg[p] { inDist[p] = 0; q2.append(p) }
    var h2 = 0
    while h2 < q2.count { let p = q2[h2]; h2 += 1; if inDist[p] > PROTECT { continue }; let x = p % w
      for q in [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w] where q >= 0 && q < n && inDist[q] == Int.max { inDist[q] = inDist[p] + 1; q2.append(q) } }
    // 가장 가까운 안쪽 털 색(F): 반투명 픽셀의 색을 복원할 때 쓴다
    var src = [Int](repeating: -1, count: n); var q3: [Int] = []
    for p in 0..<n where !bg[p] && inDist[p] > PROTECT { src[p] = p; q3.append(p) }
    var h3 = 0, reach = [Int](repeating: 0, count: n)
    while h3 < q3.count { let p = q3[h3]; h3 += 1; if reach[p] >= 3 * PROTECT { continue }; let x = p % w
      for q in [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w] where q >= 0 && q < n && src[q] == -1 { src[q] = src[p]; reach[q] = reach[p] + 1; q3.append(q) } }
    var al = [Double](repeating: 0, count: n)
    var rgbOut = f.rgb
    for p in 0..<n {
      if !bg[p] && inDist[p] > PROTECT { al[p] = 1; continue }
      if bg[p] && dist[p] > SOFT_BAND { continue }  // 캐릭터에서 먼 배경은 완전 투명(압축 얼룩 방지)
      let onFloor = p / w >= floorStartRow
      var d = 0.0, B = [0.0, 0.0, 0.0], P = [0.0, 0.0, 0.0]
      for c in 0..<3 { B[c] = plate[p * 3 + c] + levels[fi]; P[c] = Double(f.rgb[p * 3 + c]); let diff = P[c] - B[c]; d = max(d, onFloor ? diff : abs(diff)) }
      let a = min(1, max(0, (d - KEY_FROM) / KEY_RANGE))
      al[p] = a
      if a > 0 && a < 1 {
        for c in 0..<3 { rgbOut[p * 3 + c] = UInt8(max(0, min(255, a >= 0.3 ? (P[c] - (1 - a) * B[c]) / a : (src[p] >= 0 ? Double(f.rgb[src[p] * 3 + c]) : P[c])))) } }
    }
    outRGB.append(rgbOut)
    // 워터마크 자리는 무조건 투명
    for y in Int(Double(h) * wm.y)..<h { for x in Int(Double(w) * wm.x)..<w { al[y * w + x] = 0 } }
    alphas.append(al)
  }
  // 깜빡임 방지: 앞뒤(반복 영상이라 처음·끝은 서로 이웃) 프레임이 모두 보이는 픽셀은 이번 프레임에서도 보이게
  let N = alphas.count
  // HOLE_FILL=0: 꼬리를 빠르게 흔드는 영상은 앞뒤 프레임의 꼬리 자리가 회색 배경째로 메워지므로 끈다.
  let filled = ProcessInfo.processInfo.environment["HOLE_FILL"] == "0" ? alphas : (0..<N).map { i -> [Double] in
    let prev = alphas[(i - 1 + N) % N], next = alphas[(i + 1) % N]
    return (0..<n).map { p in max(alphas[i][p], min(prev[p], next[p])) } }

  // 출력 1: HEVC + 알파(.mov), 출력 2: 초록과 섞은 H.264(.mp4)
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
  for i in 0..<N {
    for (ad, green) in [(aA, false), (aG, true)] {
      var pbOut: CVPixelBuffer?; CVPixelBufferPoolCreatePixelBuffer(nil, ad.pixelBufferPool!, &pbOut); let pb = pbOut!
      CVPixelBufferLockBaseAddress(pb, []); let rb = CVPixelBufferGetBytesPerRow(pb)
      let px = CVPixelBufferGetBaseAddress(pb)!.assumingMemoryBound(to: UInt8.self)
      for y in 0..<h { for x in 0..<w { let p = y * w + x, o = y * rb + x * 4, al = filled[i][p]
        let r = Double(outRGB[i][p * 3]), g = Double(outRGB[i][p * 3 + 1]), b = Double(outRGB[i][p * 3 + 2])
        if green { px[o] = UInt8(b * al); px[o + 1] = UInt8(g * al + 255 * (1 - al)); px[o + 2] = UInt8(r * al); px[o + 3] = 255 }
        else { px[o] = UInt8(b * al); px[o + 1] = UInt8(g * al); px[o + 2] = UInt8(r * al); px[o + 3] = UInt8(al * 255) } } } // 알파는 premultiplied
      CVPixelBufferUnlockBaseAddress(pb, [])
      while !ad.assetWriterInput.isReadyForMoreMediaData { usleep(1000) }
      ad.append(pb, withPresentationTime: times[i]) }
  }
  for wr in [wA, wG] { wr.inputs.forEach { $0.markAsFinished() }; await wr.finishWriting() }
  print(wA.status == .completed && wG.status == .completed ? "ok \(N) frames @\(fps)fps" : "fail \(String(describing: wA.error)) \(String(describing: wG.error))")
  sema.signal()
}
sema.wait()
