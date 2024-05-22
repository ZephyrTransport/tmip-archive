'use strict'

const fs = require('fs').promises;
const papaparse = require('papaparse')


async function main() {

    const raw = await fs.readFile("webinars.csv");
    const text = new TextDecoder('utf-8').decode(raw)

    // fix webinar attachment URLs

    const text2 = text.replaceAll("/sites/freightmodelimprovementprogram.localhost/files/webinars/",
        "/webinars/")


    let csv = papaparse.parse(text2, {header: true, newline: '\n', delimiter: ';'}).data

    console.log('csvlength', csv.length)

//     csv.sort((a,b) => a.date_timestamp > b.date_timestamp ? 1 : -1)


//     Create a thread for each subject. Same subject, and Re: Subject
//     count as a similar thread.
//     TODO: time-limit on replies?
//
//     const threads = {}
//     let numThreads = 0
//
//     for (const row of csv) {
//
//         const subject = row.subject
//         console.log(subject)
//         if (subject in threads) {
//             same subject
//             row.thread = threads[subject]
//         } else if (subject.replaceAll('Re: ','').trim() in threads) {
//             Re: replies
//             row.thread = threads[subject.replaceAll('Re: ','').trim()]
//         } else {
//             new thread
//             threads[subject] = numThreads
//             numThreads++
//             row.thread = threads[subject]
//         }
//     }
//
//     console.log(numThreads, "threads.")
//     console.log(Object.keys(threads))

    const unparse = papaparse.unparse(csv, {
        newline: "\n",
        skipEmptyLines: true
    })

    console.log("writing")
    await fs.writeFile('fixed-webinars.csv', unparse, 'utf8')
}

main()
