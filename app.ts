# Football API — UTN FRVT

API REST para consulta de resultados de fútbol en tiempo real e históricos.

## Stack

- Node.js + TypeScript
- Express
- MongoDB
- API-Football

## Competiciones permitidas (whitelist exclusiva)

Esta API **solo** devuelve datos de estas competiciones. Cualquier amistoso,
copa local o torneo no listado queda filtrado automáticamente en todos los
endpoints (ver `src/utils/leagueWhitelist.ts`):

| ID  | Competición                         | País      |
|-----|--------------------------------------|-----------|
| 39  | Premier League                       | Inglaterra|
| 140 | La Liga                              | España    |
| 135 | Serie A                              | Italia    |
| 78  | Bundesliga                           | Alemania  |
| 61  | Ligue 1                              | Francia   |
| 128 | Liga Profesional Argentina           | Argentina |
| 71  | Brasileirão Série A                  | Brasil    |
| 1   | FIFA World Cup (Mundial 2026)        | —         |

> ⚠️ El ID 71 (Brasileirão) está tomado de la documentación pública de
> API-Football. Si tu cuenta devolviera un ID distinto, confirmalo con
> `GET /leagues?search=Brazil` usando tu propia API key y ajustalo en
> `src/utils/leagueWhitelist.ts` (es el único lugar del código que hay que tocar).

## Temporada automática (sin años hardcodeados)

Ya no hace falta pasar `?season=AÑO` a mano. `src/utils/season.ts` calcula
la temporada vigente según la fecha real del sistema:
- Ligas europeas (Premier, La Liga, Serie A, Bundesliga, Ligue 1): temporada
  cruzada (ago–jun), se calcula el año de arranque correcto.
- Liga Argentina, Brasileirão y Mundial: temporada = año calendario actual.

Si necesitás forzar una temporada puntual (ej. para ver el año pasado), podés
seguir pasando `?season=2025` y eso tiene prioridad sobre el cálculo automático.

## Limpieza de datos viejos

Antes de este fix, `/api/matches/competition/:id` solo leía lo que ya hubiera
en Mongo y nunca refrescaba desde la API — por eso podían quedar amistosos,
copas no clave o partidos de temporadas viejas pegados para siempre. Si tu
base ya tiene esos datos, corré una sola vez:

```
npm run cleanup:legacy
```

Esto borra de Mongo todo lo que no sea una de las 8 competiciones permitidas.
No hace falta volver a correrlo: de ahora en adelante, todos los endpoints
filtran siempre por la whitelist y refrescan desde la API en cada consulta.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/matches/today` | Partidos del día |
| `GET` | `/api/matches/live` | Partidos en vivo |
| `GET` | `/api/matches?date=YYYY-MM-DD` | Partidos por fecha |
| `GET` | `/api/matches/status/:status` | Filtrar por estado |
| `GET` | `/api/matches/competition/:id` | Partidos por competición (refresca desde la API) |
| `GET` | `/api/matches/:id/detail` | Detalle y eventos del partido |
| `PUT` | `/api/matches/:id` | Actualizar resultado |
| `GET` | `/api/standings?league=39` | Tabla de posiciones (temporada vigente automática) |
| `GET` | `/api/competitions?country=Argentina` | Ligas por país |
| `GET` | `/api/competitions/:id/fixtures` | Fixture completo de una liga (temporada vigente automática) |
| `GET` | `/api/teams/search?name=river` | Buscar equipos |

