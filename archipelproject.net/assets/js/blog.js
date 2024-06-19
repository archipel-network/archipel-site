import "/assets/js/lib/jsonld.js"
import rdfaParser from "/assets/js/lib/jsonld-rdfa.js"
jsonld.registerRDFParser('text/html', rdfaParser);

const CONTEXT = { "@vocab": "http://schema.org/", "@language": "fr", "hasPart": { "@container": "@set" } }
const DATE_FORMATTER = Intl.DateTimeFormat("fr-fr", {
    dateStyle: "long"
})

export async function loadArticles(container, options) {

    let {limit} = {
        limit: null,
        ...options
    }

    let url = `/${container.closest("[lang]").lang}/articles/`;

    let blog = await jsonld.frame(await jsonld.fromRDF(url, { format: "text/html" }), {
        "@context": CONTEXT,
        "@type": "Blog"
    })

    let articles = blog.hasPart;

    if(limit){
        articles = articles.slice(0, limit)
    }

    articles.map(it => {
        let el = document.createElement("article");
        document.getElementById("article-cards").append(el)
        return [it, el]
    }).map(async ([it, container]) => {
        let article = await jsonld.frame(await jsonld.fromRDF(it["@id"], { format: "text/html" }), {
            "@context": CONTEXT,
            "@type": "Article"
        })

        let h2 = document.createElement("h2")
        let a = document.createElement("a")
        a.href = article["@id"]
        a.textContent = article.name
        h2.append(a)
        container.append(h2)

        let meta = document.createElement("div")
        meta.classList.add("meta")
        if (article.datePublished["@value"] || article.datePublished) {
            let datePub = new Date(article.datePublished["@value"] || article.datePublished);
            let date = document.createElement("time")
            date.dateTime = datePub.toISOString()
            date.textContent = DATE_FORMATTER.format(datePub)
            meta.append(date)
        }
        container.append(meta)

        if (article.abstract) {
            let p = document.createElement("p")
            p.textContent = article.abstract
            container.append(p)
        }

        let pa = document.createElement("p")
        pa.classList.add("more")
        let moreA = a.cloneNode()
        moreA.textContent = "Lire l'article ->"
        pa.append(moreA)
        container.append(pa)
    })
}