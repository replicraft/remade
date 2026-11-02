# November 2 catalog additions

11 entries are proposed in a separate PR from audit #236. Five superseded requests are removed under the catalog uniqueness rule. No issues are commented on or closed.

| Project | Target and boundaries |
| --- | --- |
| [OxyPixel](https://github.com/crisprintsstuff/oxypixel) | aseprite — Early release; full Aseprite behavior and plugin compatibility are not claimed. ASE imports convert to OXYPix rather than saving back: tilemaps become plain layers, reference layers are omitted and cel opacity is baked into pixels. Editing is limited to 1024 pixels per side, 256 frames and 32 layers. Windows downloads are unsigned. |
| [PixelCraft](https://github.com/asad-albadi/PixelCraft) | aseprite — Early alpha. Published v0.1.0 assets cover Linux; Windows installer workflows are documented but a released installer was not verified. Full ICC preview, arbitrary Aseprite Lua APIs, original themes and some ASE encodings or tileset arrangements are unsupported. Other platforms remain unvalidated. |
| [Rook](https://github.com/AsyncFinn/rook) | roblox — Early development; file-loading and script-test results are maintainer-reported, not full game compatibility. GUI support remains in progress. Does not connect to Roblox servers or provide wire compatibility with the official client/server. Game places and assets must be supplied separately; some content resolution uses Roblox services. |
| [Sue](https://github.com/MagiGun/sue) | clip-studio-paint — Early software; native Clip Studio project, brush, material and service compatibility is not established. Uses its own SUE project container. Larger planned studios and AI runtimes are not implemented. The Sayn License requires the exact text Sayn was here in at least one file of distributions, modifications or incorporating projects. iOS packages require sideloading. |
| [OxyBrush](https://github.com/crisprintsstuff/OxyBrush) | zbrush — Alpha; native ZBrush file interoperability is research, not shipped support. Dynamic topology, vertex color, sculpt layers, posing, UVs and baking remain planned. Tablet pressure and high-poly performance need qualification. Windows builds are unsigned and macOS packages are not notarized; iPad is planned. |
| [HumanMotionCraft](https://github.com/YalKouassi/HumanMotionCraft) | cascadeur — Not a Spine 2D replacement or a full Cascadeur clone; native Cascadeur project compatibility is not established. Focuses on humanoids rather than arbitrary rigs, character creation or a full 3D scene editor. Published releases are Windows-only; Linux builds are documented. Optional motion-from-text helpers require separate models with their own licenses. |
| [ModelCraft](https://github.com/Felzow47/ModelCraft) | edrawings-viewer — MIT is declared in the README, NOTICE and Cargo metadata; a standalone project license text was not found. Bundled components retain their own licenses. Format coverage is partial and maintainer-reported. Some formats need optional Open CASCADE, assimp or web-ifc builds. This is a viewer, not a CAD authoring replacement. |
| [encoderCraft](https://github.com/el-j/encoderCraft) | adobe-media-encoder — Not a usable general-purpose Media Encoder replacement. The inspected pipeline does not read the job source: video output uses 24 allocated frames and audio stems use silent buffers. README/Cargo declare MIT OR Apache-2.0, but the referenced project license files are absent. Native AME project and Adobe integration compatibility are unverified. |
| [Drop](https://github.com/Drop-OSS/drop) | steam — A broader alternative, not a compatible Steam client or replacement for Valve accounts, DRM, purchases, Workshop or multiplayer services. Requires a self-hosted server and separately supplied games. Upstream is in maintenance mode with bug fixes and external contributions still accepted; client packages vary by platform. |
| [GameDepot](https://github.com/cmspeedau/GameDepot) | steam — Early fork; release maturity and broad roadmap completion are not independently verified. Does not reproduce Steam accounts, DRM, store purchases, Workshop or service APIs. Store adapters and networking depend on external projects and services; inherited components retain their respective licenses. |
| [GameVault](https://github.com/Phalcode/gamevault-backend) | steam — Source-available under a noncommercial license, not open-source software. Does not replace Steam purchases, accounts, DRM or service APIs. Requires a server and separately supplied games; client implementations live in separate repositories. GameVault 2 clients are public beta, with GameVault+ features still missing. |

## Already listed

[mbSCADA](https://remade.wiki/projects/mbscada/) already points to the supplied repository and targets Modbus Poll.

## Horizon: hold

I would not list Horizon under the current clean-room editorial standard without further provenance clarification. The current workflow goes beyond black-box observation: it tells implementers to read the vanilla bytecode/code first and to translate vanilla methods. Full decompilation is explicitly documented.

This does not determine legality or prove that every function incorporates protected expression. A from-scratch claim, MIT license and user-supplied game assets do not establish separation between binary analysis and implementation. A separately authored behavioral-specification process would need to be explained before reconsideration.

Evidence:
- [Implementers are instructed to read vanilla code/bytecode before writing Horizon code.](https://github.com/horizon-rust/horizon/blob/43de4c91010baa6d01be6bbe82d927879cbcef07/CONTRIBUTING.md)
- [Method-to-function port ledger and explicit instruction to translate vanilla methods rather than reinvent them.](https://github.com/horizon-rust/horizon/blob/e1cb997dbd35d26668bac525a8515a5231cacc6c/.claude/skills/vanilla-parity/SKILL.md)
- [Full client/server Vineflower decompilation and JADX method queries are documented.](https://github.com/horizon-rust/horizon/blob/e1cb997dbd35d26668bac525a8515a5231cacc6c/docs/decompilation-status.md)

## Classifications and approvals

- HumanMotionCraft is a 3D humanoid animator, not Spine 2D. Added for Cascadeur-style workflows with explicit maintainer approval; native Cascadeur compatibility is not claimed.
- ModelCraft fits eDrawings-style CAD viewing, not full CAD authoring. Its slug is `modelcraft-viewer` to distinguish the existing ModelCraft entry.
- Drop and GameDepot cover self-hosted Steam-style library/distribution workflows. GameDepot is a disclosed Drop fork.
- The retained Phalcode GameVault is at gamevau.lt and has a noncommercial source-available license. It is not represented as open-source.
- gamevault.to is a different product. No public source was located; the maintainer explicitly requested leaving it off.
- Sue uses the custom Sayn License, including its extra attribution-string condition.
- ModelCraft and encoderCraft declare MIT / MIT-or-Apache in their own documentation but lack standalone project license texts; those missing-file caveats remain visible.
- encoderCraft is listed as experimental components, not a functioning general-purpose source-media transcoder: the reviewed pipeline generates synthetic blank frames and silent stems.

The [structured evidence record](2026-11-02-catalog-additions.json) includes revisions, sources, decisions and URL checks.
