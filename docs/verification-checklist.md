# Verified community node checklist

Source: [n8n verification guidelines](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines/), [submission requirements](https://docs.n8n.io/connect/create-nodes/deploy-your-node/submit-community-nodes/) and [UX guidelines](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/ux-guidelines/). This is a checklist, not a claim that n8n has verified or accepted the package.

- [ ] **Node eligibility:** n8n requires a node not to duplicate an existing node, does not currently accept logic or flow-control nodes, and generally rejects proxy layers wrapping multiple unrelated services. This package targets Straitly, itself an AI gateway. Whether n8n treats it as eligible is for n8n to decide; check existing integrations and ask n8n if necessary.
- [x] **Package naming and metadata:** `n8n-nodes-straitly` uses the required prefix and `n8n-community-node-package` keyword. Node and credential paths are declared in `package.json`; verify the final package includes all intended nodes.
- [ ] **Public source and ownership:** owner must make the GitHub repository public, check the npm repository URL and working git link, and ensure npm author/maintainer and repository ownership match.
- [x] **License:** package declares MIT; verify the license file is included and accurate before release.
- [x] **Documentation:** README includes authentication, usage, examples and API documentation links. Check examples and the AI Agent guide against the final implementation.
- [ ] **No runtime dependencies:** package currently has no `dependencies`; confirm the final published package and all built runtime imports comply. Development and peer dependencies are not bundled runtime dependencies.
- [ ] **No environment or filesystem access in node runtime:** audit the final built node and its runtime imports. The local smoke script uses an environment variable and is not shipped as node runtime.
- [ ] **TypeScript, validation and errors:** verify all final code and UX, including validation, English-only UI and documentation, error handling and accessible icons.
- [ ] **Tests and scans:** run `npm run lint`, `npm test`, `npm run build`, local n8n testing (`npm run dev`), and `npx @n8n/scan-community-package n8n-nodes-straitly` against the published package. Resolve every failure before submission.
- [ ] **GitHub Actions provenance:** configure npm Trusted Publishing for this repository and `publish.yml` (or an appropriately scoped npm token); verify `@n8n/node-cli` is at least 0.23.0. Publish from the GitHub Actions workflow with provenance and verify the npm attestation. A local publish does not satisfy the current requirement.
- [ ] **Submit:** after publication and checks, submit the npm package via the [n8n Creator Portal](https://creators.n8n.io/nodes). n8n reviews the submission and may reject competing paid features. Do not describe the node as verified until n8n confirms it.
