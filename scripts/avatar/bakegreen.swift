import AVFoundation
import CoreVideo
// usage: bakegreen <in.mp4> <out.mp4> <size>
// 각 프레임에서 테두리에 이어진 배경(flood, 위쪽 엄격/아래 바닥 느슨)과 작은 얼룩을 찾아 순수 초록(0,255,0)으로 칠한다.
// 앱은 초록만 지우면 되므로 기기마다 색 해석이 조금 달라도 캐릭터가 지워지지 않는다.
let a = CommandLine.arguments
let src = AVURLAsset(url: URL(fileURLWithPath: a[1])); let outURL = URL(fileURLWithPath: a[2]); let S = Int(a[3])!
let lo = 140.0, hi = 218.0, satMax = 0.035, step = 10, floorFrom = 0.78, floorHi = 224.0, floorSat = 0.06, floorStep = 16
let wm = (x: 0.8, y: 0.93, w: 0.2, h: 0.08); let wmColor: (UInt8, UInt8, UInt8) = (208, 208, 206)

func key(_ px: UnsafeMutablePointer<UInt8>, _ w: Int, _ h: Int, _ rowBytes: Int) {
  // BGRA
  for y in Int(Double(h) * wm.y)..<h { for x in Int(Double(w) * wm.x)..<w { let i = y * rowBytes + x * 4
    px[i] = wmColor.2; px[i + 1] = wmColor.1; px[i + 2] = wmColor.0 } }
  let n = w * h; let floorStart = Int(Double(h) * floorFrom) * w
  func rgb(_ p: Int) -> (Int, Int, Int) { let i = (p / w) * rowBytes + (p % w) * 4; return (Int(px[i + 2]), Int(px[i + 1]), Int(px[i])) }
  func isBg(_ p: Int) -> Bool { let (r, g, b) = rgb(p); let br = Double(r + g + b) / 3; let mx = max(r, g, b), mn = min(r, g, b)
    let sat = mx == 0 ? 0 : Double(mx - mn) / Double(mx); let f = p >= floorStart
    return br >= lo && br <= (f ? floorHi : hi) && sat <= (f ? floorSat : satMax) }
  func close(_ p: Int, _ q: Int) -> Bool { let x = rgb(p), y = rgb(q)
    return abs(x.0 - y.0) + abs(x.1 - y.1) + abs(x.2 - y.2) <= (q >= floorStart ? floorStep : step) }
  var bg = [Bool](repeating: false, count: n); var stack: [Int] = []
  func seed(_ p: Int) { if !bg[p] && isBg(p) { bg[p] = true; stack.append(p) } }
  for x in 0..<w { seed(x); seed((h - 1) * w + x) }; for y in 0..<h { seed(y * w); seed(y * w + w - 1) }
  while let p = stack.popLast() { let x = p % w
    for q in [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w] where q >= 0 && q < n && !bg[q] && isBg(q) && close(p, q) { bg[q] = true; stack.append(q) } }
  var label = [Int](repeating: 0, count: n); var sizes = [0]
  for s0 in 0..<n where !bg[s0] && label[s0] == 0 { let id = sizes.count; var size = 0; label[s0] = id; stack.append(s0)
    while let p = stack.popLast() { size += 1; let x = p % w
      for q in [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w] where q >= 0 && q < n && !bg[q] && label[q] == 0 { label[q] = id; stack.append(q) } }
    sizes.append(size) }
  let minKeep = Double(sizes.max() ?? 0) * 0.02
  for p in 0..<n where bg[p] || Double(sizes[label[p]]) < minKeep { let i = (p / w) * rowBytes + (p % w) * 4; px[i] = 0; px[i + 1] = 255; px[i + 2] = 0 }
}

let sema = DispatchSemaphore(value: 0)
Task {
  let track = try await src.loadTracks(withMediaType: .video)[0]; let fps = try await track.load(.nominalFrameRate)
  let reader = try AVAssetReader(asset: src)
  let comp = AVMutableVideoComposition(); comp.renderSize = CGSize(width: S, height: S); comp.frameDuration = CMTime(value: 1, timescale: CMTimeScale(fps.rounded()))
  let natural = try await track.load(.naturalSize)
  let inst = AVMutableVideoCompositionInstruction(); inst.timeRange = CMTimeRange(start: .zero, duration: try await src.load(.duration))
  let li = AVMutableVideoCompositionLayerInstruction(assetTrack: track); li.setTransform(CGAffineTransform(scaleX: CGFloat(S) / natural.width, y: CGFloat(S) / natural.height), at: .zero)
  inst.layerInstructions = [li]; comp.instructions = [inst]
  let rout = AVAssetReaderVideoCompositionOutput(videoTracks: [track], videoSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
  rout.videoComposition = comp; reader.add(rout)
  try? FileManager.default.removeItem(at: outURL)
  let writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
  let win = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: S, AVVideoHeightKey: S,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 1_400_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel]])
  let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: win, sourcePixelBufferAttributes: nil)
  writer.add(win); reader.startReading(); writer.startWriting(); writer.startSession(atSourceTime: .zero)
  var count = 0
  while let sb = rout.copyNextSampleBuffer() {
    let pb = CMSampleBufferGetImageBuffer(sb)!; let t = CMSampleBufferGetPresentationTimeStamp(sb)
    CVPixelBufferLockBaseAddress(pb, [])
    key(CVPixelBufferGetBaseAddress(pb)!.assumingMemoryBound(to: UInt8.self), CVPixelBufferGetWidth(pb), CVPixelBufferGetHeight(pb), CVPixelBufferGetBytesPerRow(pb))
    CVPixelBufferUnlockBaseAddress(pb, [])
    while !win.isReadyForMoreMediaData { usleep(1000) }
    adaptor.append(pb, withPresentationTime: t); count += 1 }
  win.markAsFinished(); await writer.finishWriting()
  print(writer.status == .completed ? "ok \(count) frames" : "fail \(String(describing: writer.error))")
  sema.signal()
}
sema.wait()
