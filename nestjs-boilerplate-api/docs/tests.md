# Tests

> **BuildBase example.** Upstream's end-to-end suites signed in with email and password against Docker, so they are removed. `npm test` runs unit tests for the BuildBase guard and sign-in rules, with no database or network.

## Table of Contents <!-- omit in toc -->

- [Unit Tests](#unit-tests)
- [E2E Tests](#e2e-tests)
- [Tests in Docker](#tests-in-docker)
  - [For relational database](#for-relational-database)
  - [For document database](#for-document-database)

## Unit Tests

```bash
npm run test
```

## E2E Tests

```bash
npm run test:e2e
```

## Tests in Docker

### For relational database

```bash
npm run test:e2e:relational:docker
```

### For document database

```bash
npm run test:e2e:document:docker
```

---

Previous: [File uploading](file-uploading.md)

Next: [Benchmarking](benchmarking.md)
