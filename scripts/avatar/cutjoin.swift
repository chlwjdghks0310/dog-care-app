import AVFoundation
import CoreGraphics
// usage: cutjoin2 <out.mp4> <clip1> [clip2 ...]
// Hard-cut loop. For each consecutive pair (and last→first), picks the cut-out frame in the clip's last 3s
// and cut-in frame in the next clip's first 1.5s that look most alike, so every cut reads as continuous.
let a = CommandLine.arguments
let out = URL(fileURLWithPath: a[1]); let clips = a[2...].map { AVURLAsset(url: URL(fileURLWithPath: $0)) }
func frames(_ asset: AVAsset, from: Double, to: Double, fps: Double) -> [(Double, [UInt8])] {
  let g = AVAssetImageGenerator(asset: asset); g.requestedTimeToleranceBefore = .zero; g.requestedTimeToleranceAfter = .zero
  g.maximumSize = CGSize(width: 64, height: 64)
  var res: [(Double, [UInt8])] = []; var t = from
  while t <= to {
    if let cg = try? g.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil) {
      var buf = [UInt8](repeating: 0, count: 64 * 64 * 4)
      let ctx = CGContext(data: &buf, width: 64, height: 64, bitsPerComponent: 8, bytesPerRow: 256, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
      ctx.draw(cg, in: CGRect(x: 0, y: 0, width: 64, height: 64)); res.append((t, buf)) }
    t += 1.0 / fps }
  return res }
func diff(_ x: [UInt8], _ y: [UInt8]) -> Int { var s = 0; for i in 0..<x.count where i % 4 != 3 { s += abs(Int(x[i]) - Int(y[i])) }; return s / (64 * 64 * 3) }
let sema = DispatchSemaphore(value: 0)
Task {
  var tracks: [AVAssetTrack] = []; var durs: [Double] = []; var fpss: [Double] = []
  for c in clips { let t = try await c.loadTracks(withMediaType: .video)[0]; tracks.append(t)
    durs.append(CMTimeGetSeconds(try await c.load(.duration))); fpss.append(Double(try await t.load(.nominalFrameRate))) }
  let N = clips.count
  let minLen = Double(ProcessInfo.processInfo.environment["MIN_LEN"] ?? "3") ?? 3
  // pair i: clip i tail → clip (i+1)%N head. Precompute all diffs, then pick cut points jointly so every clip keeps ≥ minLen.
  var tails: [[(Double, [UInt8])]] = [], heads: [[(Double, [UInt8])]] = []
  for i in 0..<N {
    tails.append(frames(clips[i], from: max(0, durs[i] - 3), to: durs[i] - 0.5 / fpss[i], fps: fpss[i]))
    heads.append(frames(clips[i], from: 0, to: min(1.5, durs[i] - 1), fps: fpss[i])) }
  var pair: [[[Int]]] = []  // pair[i][tailIdx][headIdx of clip i+1]
  for i in 0..<N { let j = (i + 1) % N
    pair.append(tails[i].map { t in heads[j].map { h in diff(t.1, h.1) } }) }
  var cutOut = durs, cutIn = Array(repeating: 0.0, count: N)
  var bestScore = Int.max
  // N ≤ 2: exhaustive over (in index per clip); for each, best tail per pair given length constraint.
  func search(_ inIdx: [Int]) {
    var mx = 0, sum = 0; var outs: [Double] = []
    for i in 0..<N { let j = (i + 1) % N
      var b = Int.max, bt = 0.0
      for (ti, t) in tails[i].enumerated() where t.0 - heads[i][inIdx[i]].0 >= minLen {
        let d = pair[i][ti][inIdx[j]]; if d < b { b = d; bt = t.0 } }
      if b == Int.max { return }
      mx = max(mx, b); sum += b; outs.append(bt) }
    let score = mx * 1000 + sum
    if score < bestScore { bestScore = score; cutOut = outs; cutIn = inIdx.enumerated().map { heads[$0.offset][$0.element].0 } } }
  if N == 1 { for a0 in heads[0].indices { search([a0]) } }
  else { for a0 in heads[0].indices { for a1 in heads[1].indices { search([a0, a1]) } } }
  for i in 0..<N { let j = (i + 1) % N
    let ti = tails[i].firstIndex { $0.0 == cutOut[i] }!, hj = heads[j].firstIndex { $0.0 == cutIn[j] }!
    print("clip \(i + 1) → clip \(j + 1): out at \(String(format: "%.2f", cutOut[i]))s, in at \(String(format: "%.2f", cutIn[j]))s, diff \(pair[i][ti][hj])") }
  let comp = AVMutableComposition()
  let track = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
  var cursor = CMTime.zero
  for i in 0..<N {
    let r = CMTimeRange(start: CMTime(seconds: cutIn[i], preferredTimescale: 600), end: CMTime(seconds: cutOut[i], preferredTimescale: 600))
    try track.insertTimeRange(r, of: tracks[i], at: cursor); cursor = cursor + r.duration }
  try? FileManager.default.removeItem(at: out)
  let ex = AVAssetExportSession(asset: comp, presetName: ProcessInfo.processInfo.environment["FULL_RES"] == "1" ? AVAssetExportPresetHighestQuality : AVAssetExportPresetMediumQuality)! // FULL_RES=1: 원본 해상도(다시 생성용 원본)
  ex.outputURL = out; ex.outputFileType = .mp4; ex.shouldOptimizeForNetworkUse = true
  await ex.export()
  print(ex.status == .completed ? "ok \(String(format: "%.2f", CMTimeGetSeconds(cursor)))s" : "fail \(String(describing: ex.error))")
  sema.signal()
}
sema.wait()
