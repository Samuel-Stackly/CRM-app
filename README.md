# Work Book — multi-app monorepo

Each app lives under `apps/<name>/` with its own `client/` and `server/`.

| App    | Folder        | Client | Server | Setup                                   |
| ------ | ------------- | ------ | ------ | --------------------------------------- |
| `crm`  | `apps/crm`    | 5173   | 5000   | Mini CRM                                |
| `app2` | `apps/app2`   | 5174   | 5001   | ShopDesk — [README](apps/app2/README.md) |

## Switching the active app

Edit `activeApp` in [`apps.config.json`](apps.config.json):

```json
{ "activeApp": "app2" }
```

Every root script then targets that app. Nothing inside the apps needs to
change — the runner injects each app's `PORT` and `VITE_PORT` from this file.

For a one-off run without editing the file, prefix the command:

```bash
APP=app2 npm run dev
```

## Root scripts

```bash
npm run apps          # list apps, * marks the active one
npm run install:all   # install deps for the active app's client + server
npm run dev           # run the active app's client + server together
npm run dev:client    # client only
npm run dev:server    # server only
npm run build         # build both sides
npm run lint          # lint the client
npm test              # run the server tests
```

Each app's `client/` and `server/` keep their own `package.json`, so you can
also `cd apps/crm/server && npm run dev` as before.
