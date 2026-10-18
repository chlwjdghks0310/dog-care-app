import AppKit
// usage: [BG=#rrggbb FG=#rrggbb] makeicon <src.png> <outdir>
// BG/FG를 주면 원본 배경색·발바닥색을 새 색으로 바꿔 칠한다(가장자리 부드러움은 그대로).
// 스크린샷 아이콘(둥근 모서리·바깥 테두리 포함)에서 발바닥만 잘라 꽉 찬 정사각형 배경 위 정가운데에 다시 얹는다.
let a = CommandLine.arguments
let src = NSImage(contentsOfFile: a[1])!.cgImage(forProposedRect: nil, context: nil, hints: nil)!
let W = src.width, H = src.height
var px = [UInt8](repeating: 0, count: W * H * 4)
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
let rctx = CGContext(data: &px, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
rctx.draw(src, in: CGRect(x: 0, y: 0, width: W, height: H))
func at(_ x: Int, _ y: Int) -> (Int, Int, Int) { let i = (y * W + x) * 4; return (Int(px[i]), Int(px[i + 1]), Int(px[i + 2])) }
// 배경색: 안쪽 넓은 영역(위쪽 띠)의 중앙값
var gs: [(Int, Int, Int)] = []
for y in stride(from: H / 10, to: H / 5, by: 3) { for x in stride(from: W / 4, to: W * 3 / 4, by: 7) { gs.append(at(x, y)) } }
func med(_ v: [Int]) -> Int { v.sorted()[v.count / 2] }
let bg = (med(gs.map { $0.0 }), med(gs.map { $0.1 }), med(gs.map { $0.2 }))
// 발바닥 영역: 배경보다 많이 밝은 픽셀(안쪽 12%~88%만 — 바깥 흰 테두리 제외)
var x0 = W, y0 = H, x1 = 0, y1 = 0
for y in H * 12 / 100..<H * 88 / 100 { for x in W * 12 / 100..<W * 88 / 100 {
  let p = at(x, y); if p.0 + p.1 + p.2 > bg.0 + bg.1 + bg.2 + 200 { x0 = min(x0, x); x1 = max(x1, x); y0 = min(y0, y); y1 = max(y1, y) } } }
print("bg rgb \(bg) paw \(x0)...\(x1) x \(y0)...\(y1)")
let m = 24
let crop0 = src.cropping(to: CGRect(x: x0 - m, y: y0 - m, width: x1 - x0 + 2 * m, height: y1 - y0 + 2 * m))!
func hex(_ s: String?) -> (Int, Int, Int)? { guard let s = s, s.count == 7, let v = Int(s.dropFirst(), radix: 16) else { return nil }; return (v >> 16 & 255, v >> 8 & 255, v & 255) }
let env = ProcessInfo.processInfo.environment
var crop = crop0
var fill = bg
if let nb = hex(env["BG"]) {
  // 발바닥 색(가장 밝은 쪽)과 배경색 사이에서 각 픽셀이 어디쯤인지(t)로 새 색을 섞는다
  let fg0 = at((x0 + x1) / 2, y1 - (y1 - y0) / 4)
  let nf = hex(env["FG"]) ?? fg0
  let cw = crop0.width, ch = crop0.height
  var cp = [UInt8](repeating: 0, count: cw * ch * 4)
  let cc = CGContext(data: &cp, width: cw, height: ch, bitsPerComponent: 8, bytesPerRow: cw * 4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  cc.draw(crop0, in: CGRect(x: 0, y: 0, width: cw, height: ch))
  let lo = Double(bg.0 + bg.1 + bg.2), hi = Double(fg0.0 + fg0.1 + fg0.2)
  for i in stride(from: 0, to: cp.count, by: 4) {
    let t = max(0, min(1, (Double(Int(cp[i]) + Int(cp[i + 1]) + Int(cp[i + 2])) - lo) / (hi - lo)))
    cp[i] = UInt8(Double(nb.0) + (Double(nf.0) - Double(nb.0)) * t); cp[i + 1] = UInt8(Double(nb.1) + (Double(nf.1) - Double(nb.1)) * t); cp[i + 2] = UInt8(Double(nb.2) + (Double(nf.2) - Double(nb.2)) * t); cp[i + 3] = 255 }
  crop = cc.makeImage()!
  fill = nb
}
let pawW = Double(x1 - x0), pawH = Double(y1 - y0)
let ratio = Double(ProcessInfo.processInfo.environment["PAW"] ?? "0.6") ?? 0.6 // 발바닥 가로 = 아이콘 너비의 60%
for size in [1024, 512, 192, 180, 32] {
  let S = Double(size)
  let ctx = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0, space: cs, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
  ctx.setFillColor(CGColor(srgbRed: CGFloat(fill.0) / 255, green: CGFloat(fill.1) / 255, blue: CGFloat(fill.2) / 255, alpha: 1))
  ctx.fill(CGRect(x: 0, y: 0, width: size, height: size))
  ctx.interpolationQuality = .high
  let k = S * ratio / pawW
  let w = Double(crop.width) * k, h = Double(crop.height) * k
  // 발바닥(여백 제외)이 정가운데 오도록
  ctx.draw(crop, in: CGRect(x: (S - pawW * k) / 2 - Double(m) * k, y: (S - pawH * k) / 2 - Double(m) * k, width: w, height: h))
  let rep = NSBitmapImageRep(cgImage: ctx.makeImage()!)
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(a[2])/icon-\(size).png"))
}
