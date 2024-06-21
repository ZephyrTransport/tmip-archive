# TMIP Archive

This repository contains the old TMIP mailing list archive, attachments, and links to webinars and
tools from the now-defunct FTA TMIP website.

This is a [VueJS](https://vuejs.org) client-side web app that gets merged into the
main Zephyr website at https://zephyrtransport.org/TMIP

### General site notes

- Prerequisites, you need to install these to build the site:

  - [NodeJS](https://nodejs.org) - Javascript dev tools
  - ZStd compression tool. Much better compression that zip, etc.
    On Mac run `brew install zstd`, on Linux `apt install zstd` (etc)
  - [sqlite-utils](https://sqlite-utils.datasette.io/en/stable/) - 
    Utilities for sql-lite. On Mac run `brew install sqlite-utils`
  - Data files from should be downloaded from [TMIP Archive 20240418](https://drive.google.com/drive/folders/1TMAri6F7OUi4cYrczgqAYN-tiw2L_zkG?usp=drive_link)

- This is a VueJS static site, built using the [Vite](https://vitejs.dev) code bundler. Together these
  create the javascript and css files that get inserted into https://zephyrtransport.org/TMIP

- After building, the build artifacts (css, js files) must be copied to the main zephyr source three under
  `/tmip-archive-assets`.

- Source code is in `/src` mostly as `*.vue`  Vue component files. Essentially there is one .vue file
  per page (search results, message view, webinar list, webinar).

- The `/scripts/` folder has the scripts used for preprocessing the TMIP .csv files

- The `/public/` folder contains all of the email and webinar attachments. Those files are NOT copied
  to the main website. The attachment files themselves remain here in this repo instead,
  in order to keep the main website code size small. The site links to the raw files on GitHub directly

- I did my best to relink the threaded messages based on their Subject lines. The actual links
  between messages are mostly broken, so this is not 100% accurate. But it is better than nothing?

- We are using WebAssembly libraries for SQLite and ZStd compression. This way, the
  .CSV exports from TMIP are stored in a small and quickly-queryable format. It's already set up and
  you shouldn't have to "do anything" for this to work.


### Creating the SQLite database

CSV files containing the content of the old site SQL tables were provided. I wrote some small scripts
to automate the process of converting these back into a single compressed SQLite file containing everything.

- Before running the scripts, run `npm i` once to install the node libraries the scripts need locally.
- `node create-threads.js` - this command attempts to produces threaded conversations from the messages.csv. Creates file `threads.csv`
- `node create-webinars.js` - this command fixes attachment links in the webinars.csv file. Creates `fixed-webinars.csv`
- `bash prepare-db.sh` - creates `tmip.db.zsh` compressed SQLite file from all of the .csv files

Note that once the tmip.db SQLite file is created, you can use any SQLite browsing tool to examine contents.
I like [Datasette](https://datasette.io) but there are many


### Building and testing locally

Test your changes locally before building and copying to the main site. Note, a lot of the CSS
styling information is in files on the main site and so the fonts and layout won't look perfect.
(I will try to fix this soon)

- Run `npm install` once to fetch all of the site prerequisite libraries
- Then `npm run dev` will start a local server on http://localhost:4000 where you can see your site
- It has "hot reload" so the site should update immediately when you update source files


### Building for production

I created a `build.sh` script in the root folder which builds the site for production and
copies the built file to your local clone of the Zephyr website source code

- You MUST edit the script before running, to point the $ZEPHYR variable to the local path of the repo,
  e.g. `~/git/zephyr-website`

The script just has a couple commands:

- `npm run build` compiles everything into the `/dist` folder.
- The compiled files from `/dist` are then renamed/copied into the main Zephyr website under `/tmip-archive/assets`

You should then be able to reload your local Zephyr site and see the magic :-)

Have fun,

..Billy
