# Contributing

Thank you for helping improve the Applicant Management Suite.

## Before you begin

- Search existing issues and pull requests before opening a duplicate.
- Use synthetic data only. Never submit applicant data, credentials, `.env`
  files, service-account keys, certificates, or other secrets.
- Keep AMS identity and resources separate from any organization-specific
  deployment.
- Open an issue before beginning a large behavior or architecture change.

## Development setup

Use Node.js 24 or newer and npm 10 or newer.

```bash
npm install
cp .env.example .env
cd functions && npm install && cd ..
```

Replace the placeholder values in `.env` with credentials for a disposable
development Firebase project. Do not commit the completed file.

Run the client with:

```bash
npm start
```

## Quality requirements

Before submitting a pull request, run:

```bash
npm run lint:prod
npm run typecheck
npm run test:coverage
npm run build
cd functions && npm run lint
```

Production TypeScript must pass strict checking. Do not add `@ts-nocheck`,
`@ts-ignore`, unjustified `@ts-expect-error`, or weaken compiler settings to
make a change pass.

## Pull requests

- Keep each pull request focused and explain why the change is needed.
- Add or update tests for changed behavior.
- Describe manual verification, including affected roles and responsive views.
- Call out Firebase rule, function, migration, or environment changes.
- Update documentation when setup or operator behavior changes.

By contributing, you agree that your contribution is licensed under the
project's MIT License.
