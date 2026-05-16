# Diagram Title
Package and Test Boundary from package.json

## Diagram Type
Package Diagram

## Scope
Runtime packages, dev tools, and script-level execution groupings.

## Verification Summary
Directly extracted from package.json scripts and dependencies.

## Evidence Sources
- package.json:7-56

## Mermaid Diagram
```mermaid
flowchart TD
  Scripts[package.json scripts]
  BackendStart[start:backend]
  FrontendStart[start]
  DeployLocal[deploy:local]
  DeploySepolia[deploy:sepolia]
  TestsAll[test:all]
  TestsUnit[test:unit]
  TestsIntegration[test:integration]
  TestsSystem[test:system]
  TestsBackend[test:backend]
  TestsFrontend[test:frontend]
  TestsSecurity[test:security]
  TestsDb[test:db]
  TestsFullstack[test:fullstack]

  Scripts --> BackendStart
  Scripts --> FrontendStart
  Scripts --> DeployLocal
  Scripts --> DeploySepolia
  Scripts --> TestsAll
  TestsAll --> TestsUnit
  TestsAll --> TestsIntegration
  TestsAll --> TestsBackend
  TestsAll --> TestsFrontend
  TestsAll --> TestsSystem
  Scripts --> TestsSecurity
  Scripts --> TestsDb
  Scripts --> TestsFullstack
```

## Confidence Level
High

## Unverified/Missing Areas
- No CI pipeline definitions in package.json itself.

## Sequence Diagram
```mermaid
sequenceDiagram
  participant Reader
  participant Document
  Reader->>Document: Open and read
  Document-->>Reader: Render documented content
```
