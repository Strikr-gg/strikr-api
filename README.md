# Strikr - API
Strikr is a front-end for the [strikr API](https://strikr-gg/strikr) @ [strikr.gg](https://strikr.gg).<br />
The website running this application was made as a way to demonstrate what could be built using strikr as relay to the game [OmegaStrikers](https://store.steampowered.com/app/1869590/Omega_Strikers/).
<br />

## About this repository
The source code for this API was previously private because I (@nodgear) signed an NDA with [Odyssey Interactive](https://www.odysseyinteractive.gg/) after my efforts to reverse engineer the game API but the endpoints ended up being reverse engineered and published in github a while ago.
<br />

### Features
- Displays all information displayed in game and much more by tapping into unused/hidden api endpoints from Odyssey.
- Smart Caching:
  - Not so smart...
  - If a user cache is from the "past day or before" a new snapshot of this user is created.
  - Returns the last known state of the user directly from our snapshots table instead of making unecessary requests to the game API. reducing the request time to fractions of normal.
  - Can be easily bypassed by passing a force parameter, forcing the api to renew the user snapshot using fresh game data.
- Leaderboard cache for every region. 
- Suports japanese server (why do i even have to list this as feature? common, guys, requires 0 effort to just support all servers)
- Capable of importing data from corestrike, another tool for the game tapping into the same api. This cronjob is disabled by default, please ask the developer of corestrike.gg for permission before running.*
- Displays information for alternative gamemodes, including but not limited to normal games.

*: Corestrike does not expose all information strikr needs, which means it only imports ranked data into strikr ranked snapshots

## Requirements
- NodeJS 14+
- Relational database (Recommended: PostgreSQL)

## Running this application
1. Create a new `.env` file in the root directory
2. Fill the env file following the [Environment Variables section](https://github.com/Strikr-gg/strikr-api#environment-variables)
3. Run the following commands
```bash
# pm = your nodejs package manager [npm/pnpm/yarn...]

# Push the current database schema to your db
pm prisma db push

# Generate Prisma Typings for the project
pm prisma db generate

# Run API in development mode:
pm start:dev

# Build the project
pm build

# Run API in production mode
pm start:prod
```

### Environment Variables
| Env                   | Type   | Description                             |
|-----------------------|--------|-----------------------------------------|
| JWT_SECRET            | string | Random, preferably big string used as JWT encryption seed (i recommend uuidv4) |
| ODYSSEY_TOKEN         | string | Omega Strikers JWT token.               |
| ODYSSEY_REFRESH_TOKEN | string | Omega Strikers JWT Refresh Token.       |
| DATABASE_URL          | string | [Prisma DB URL Schema](https://www.prisma.io/docs/orm/overview/databases/postgresql)


## FAQ
> This code sucks!

: i cannot disagree, but i've seen worse

> Why are there mentions of game caracters like `playmaker`?

: Omega strikers internal name is Prometheus, and like the game itself, all characters and skills have internal names different from their final names in-game.

> How do i obtain the prometheus/odyssey jwt token?

: I cannot give you this information since it was not disclosed by someone else

> Where's the interface?

: This is just the API code.<br /> For the front-end check this repository: (Strikr)[https://strikr-gg/strikr].<br />Note: The website was originally made to showcase the API but got extremely popular. Some calculations there are made for showcasing purposes and does not reflect real life performance.

> Why this api doesn't grab the token by itself?

: It is how strikr used to run and i recommend doing it instead of saving into the env<br />The branch containing this feature cannot be published. same as question 3.

<hr />

> [!IMPORTANT]  
> I am not affiliate/endorsed by Odyssey Interactive.<br />
> Omega Strikers and it's assets are property of Odyssey Interactive<br />

### Extra credits:
- [FModel](https://fmodel.app/), uModel : game content extracting
- NestJS, Apollo & GraphQL: Stack used
- [Open The Prometheus Community](https://discord.gg/f79GkCDAxy) : Friendly community for omega strikrs rev. eng. & modding
