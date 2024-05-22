'use strict'

const fs = require('fs').promises;
const papaparse = require('papaparse')


async function main() {

    const raw = await fs.readFile("messages.csv");
    const text = new TextDecoder('utf-8').decode(raw)

    // fix line endings
    const lines = text.split('\n')
    console.log(lines.length)

    const fixed = []
    let i =0
    for (let line of lines) {
        if (/^[0-9].*;/.test(line)) {
            line = '__BR__' + line
            i++
        }
        fixed.push(line)
    }

    console.log('SDSDFSDF', i)

    fixed[0] = fixed[0] + '\n'

    console.log('a')
    const bigtext = fixed.join('__NL__')
    console.log('b')
    let ma = bigtext.replaceAll('__BR__','\n')
    console.log('c')

//     ma = ma.replaceAll('";"', '","')
//     ma = ma.replaceAll(';""', ',""')

    const zzz = ma.split('\n')
    const sssh = []
    for (let i=0; i < zzz.length; i++) {
        if (i==1) continue
        let ll = zzz[i]
        if (i > 0) ll = ll.substring(0, ll.length-6)
        sssh.push(ll)
    }

    ma = sssh.join('\n')

    console.log(ma.substring(0,10000))
    let csv = papaparse.parse(ma, {header: true, newline: '\n', delimiter: ';'}).data

    console.log('d', csv.length)

//     console.log(csv)


    csv.sort((a,b) => a.date_timestamp > b.date_timestamp ? 1 : -1)

    try {
        csv = csv.filter(row => row.subject && (!row.subject.includes('out of the office')))
        csv = csv.filter(row => row.subject && (!row.subject.includes('Out of Office')))
        csv = csv.filter(row => row.subject && (!row.subject.includes('Autoreply:')))
    } catch (e) {
        console.log('oops')
    }



    // Create a thread for each subject. Same subject, and Re: Subject
    // count as a similar thread.
    // TODO: time-limit on replies?

    const threads = {}
    let numThreads = 0

    for (const row of csv) {

        const subject = row.subject
        console.log(subject)
        if (subject in threads) {
            // same subject
            row.thread = threads[subject]
        } else if (subject.replaceAll('Re: ','').trim() in threads) {
            // Re: replies
            row.thread = threads[subject.replaceAll('Re: ','').trim()]
        } else {
            // new thread
            threads[subject] = numThreads
            numThreads++
            row.thread = threads[subject]
        }
    }

    console.log(numThreads, "threads.")
//     console.log(Object.keys(threads))

    const unparse = papaparse.unparse(csv, {
        newline: "\n",
        skipEmptyLines: true
    })

    console.log("writing")
    await fs.writeFile('threads.csv', unparse, 'utf8')
}

main()
