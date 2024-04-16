This repository contains the old TMIP mailing list archive, attachments, and links to webinars and
tools from the now-defunct FTA TMIP website.

This is a VueJS client-side web app that will be merged into the main Zephyr website when it is
complete.

**Build notes:**

- This builds the JavaScript code that will be inserted to https://zephyrtransport.org/tmip-archive
- The `/public/attachments` folder contains all of the email attachments, and those are NOT copied
  to the main site. The attachment files themselves currently remain in this repo instead of being
  merged into the Zephyr website in order to keep the website code size small. (We can revisit this)
- This site makes use of WebAssembly libraries for SQLite and ZStd compression. This way, the
  .CSV exports from TMIP are stored in a small and quickly-queryable format
- I did my best to relink the threaded messages based on their Subject lines. The actual links
  between messages are mostly broken, so this is not 100% accurate. But it is better than nothing?
- `npm run build` compiles everything into the `/dist` folder. The compiled files from `/dist` are
  then copied into the main Zephyr website under `/tmip-archive/assets`

..Billy
