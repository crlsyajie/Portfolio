// Turns a video into the numbered frames a scroll scene scrubs through.
//
//   swift tools/make-frames.swift <video> [fps] [out dir] [from s] [to s]
//
// fps can be one number or desktop/mobile, e.g. 15/10.
// Defaults: 15/10 fps into assets/sitting, the whole clip. Writes <out>/desktop/NNN.jpg
// (1200 wide), <out>/mobile/NNN.jpg (760 wide) and <out>/frames.json.
// Run it from the repo root. The close-up scene was made with:
//   swift tools/make-frames.swift wan.mp4 10 assets/closeup 11.5 14.6
import AVFoundation
import AppKit

let args = CommandLine.arguments
guard args.count >= 2 else { print("usage: swift tools/make-frames.swift <video> [fps]"); exit(1) }
let asset = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let fpsArg = (args.count > 2 ? args[2] : "15/10").split(separator: "/").map { Double($0)! }
let fpsFor = ["desktop": fpsArg[0], "mobile": fpsArg.count > 1 ? fpsArg[1] : fpsArg[0]]
let outDir = args.count > 3 ? args[3] : "assets/sitting"
let from = args.count > 4 ? Double(args[4])! : 0
let to = args.count > 5 ? Double(args[5])! : CMTimeGetSeconds(asset.duration)
let duration = to - from
var manifest: [String: Any] = ["duration": duration]

let sets: [(name: String, width: Int, quality: Double)] = [("desktop", 1200, 0.42), ("mobile", 760, 0.4)]
let fm = FileManager.default
for set in sets {
  let fps = fpsFor[set.name]!
  let count = Int((duration * fps).rounded(.down))
  let dir = "\(outDir)/\(set.name)"
  try? fm.removeItem(atPath: dir)
  try! fm.createDirectory(atPath: dir, withIntermediateDirectories: true)
  let gen = AVAssetImageGenerator(asset: asset)
  gen.appliesPreferredTrackTransform = true
  gen.maximumSize = CGSize(width: set.width, height: set.width)
  gen.requestedTimeToleranceBefore = .zero
  gen.requestedTimeToleranceAfter = .zero
  var bytes = 0
  for i in 0..<count {
    let t = from + Double(i) / fps
    guard let cg = try? gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil) else { continue }
    let data = NSBitmapImageRep(cgImage: cg).representation(using: .jpeg, properties: [.compressionFactor: set.quality])!
    try! data.write(to: URL(fileURLWithPath: String(format: "%@/%03d.jpg", dir, i)))
    bytes += data.count
  }
  print("\(set.name): \(count) frames at \(fps) fps, \(bytes / 1024) KB")
  manifest[set.name] = ["frames": count, "fps": fps]
}
let json = try! JSONSerialization.data(withJSONObject: manifest, options: [.prettyPrinted, .sortedKeys])
try! json.write(to: URL(fileURLWithPath: "\(outDir)/frames.json"))
print("\(outDir)/frames.json written")
