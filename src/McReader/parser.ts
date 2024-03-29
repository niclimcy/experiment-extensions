import {
    Chapter,
    ChapterDetails,
    Tag,
    SearchResultItem,
    SourceManga,
    SimpleCarouselDiscoverItem,
    TagSection,
    MangaInfo,
    ContentRating,
} from '@paperback/types'


import entities = require('entities')

export const parseMangaDetails = ($: cheerio.Root, mangaId: string): SourceManga => {
    const primaryTitle = $('.novel-title').text().trim()

    const secondaryTitles: string[] = []
    secondaryTitles.push(decodeHTMLEntity($('img', 'div.fixed-img').attr('alt')?.trim() ?? ''))
    const altTitles = $('h2.alternative-title.text1row', 'div.main-head').text().trim().split(',')
    for (const title of altTitles) {
        secondaryTitles.push(decodeHTMLEntity(title))
    }

    const image = $('img', 'div.fixed-img').attr('data-src') ?? ''
    const author = $('span', 'div.author').next().text().trim()
    
    const description = decodeHTMLEntity($('.description').first().text().trim() ?? '')

    const arrayTags: Tag[] = []
    for (const tag of $('li', 'div.categories').toArray()) {
        const title = $(tag).text().trim()
        const id = encodeURI($(tag).text().trim())

        if (!id || !title) continue
        // @ts-ignore - paper forgot to update lol
        arrayTags.push({ id: id, title: title })
    }
    // @ts-ignore - paper forgot to update lol
    const tagSections: TagSection[] = [{ id: '0', title: 'genres', tags: arrayTags }]

    const rawStatus = $('small:contains(Status)', 'div.header-stats').prev().text().trim()
    let status = 'ONGOING'
    switch (rawStatus.toUpperCase()) {
        case 'ONGOING':
            status = 'Ongoing'
            break
        case 'COMPLETED':
            status = 'Completed'
            break
        default:
            status = 'Ongoing'
            break
    }

    return {
        mangaId: mangaId,
        mangaInfo: {
            thumbnailUrl: image,
            synopsis: description,
            primaryTitle: primaryTitle,
            secondaryTitles: secondaryTitles,
            contentRating: ContentRating.MATURE,
            status: status,
            author: author,
            tagGroups: tagSections,
        } as MangaInfo
    } as SourceManga
}

export const parseChapters = ($: cheerio.Root, sourceManga: SourceManga): Chapter[] => {
    const chapters: Chapter[] = []
    let sortingIndex = 0

    for (const chapter of $('li', 'ul.chapter-list').toArray()) {
        const title = decodeHTMLEntity($('strong.chapter-title', chapter).text().trim())
        const chapterId: string = $('a', chapter).attr('href')?.replace(/\/$/, '')?.split('/').pop() ?? ''
        if (!chapterId) continue

        const datePieces = $('time.chapter-update', chapter).attr('datetime')?.split(',') ?? []
        const date = new Date(String(`${datePieces[0]}, ${datePieces[1]}`))
        const chapNumRegex = title.match(/(\d+)(?:[-.]\d+)?/)

        let chapNum = 0
        if (chapNumRegex && chapNumRegex[1]) {
            let chapRegex = chapNumRegex[1]
            if (chapRegex.includes('-')) chapRegex = chapRegex.replace('-', '.')
            chapNum = Number(chapRegex)
        }

        chapters.push({
            chapterId: chapterId,
            sourceManga: sourceManga,
            langCode: '🇬🇧',
            chapNum: chapNum,
            title: `Chapter ${chapNum}`,
            volume: 0,
            publishDate: date,
            sortingIndex
        })
        sortingIndex++
    }

    if (chapters.length == 0) {
        throw new Error(`Couldn't find any chapters for mangaId: ${sourceManga.mangaId}!`)
    }

    return chapters
}

export const parseChapterDetails = ($: cheerio.Root, chapter: Chapter): ChapterDetails => {
    const pages: string[] = []
    for (const img of $('img', 'div#chapter-reader').toArray()) {
        let image = $(img).attr('src') ?? ''
        if (!image) image = $(img).attr('data-src') ?? ''
        if (!image) continue
        pages.push(image)
    }

    return {
        id: chapter.chapterId,
        mangaId: chapter.sourceManga.mangaId,
        pages: pages
    }
}

export const parseViewMore = ($: cheerio.Root): SimpleCarouselDiscoverItem[] => {
    const manga: SimpleCarouselDiscoverItem[] = []
    const collectedIds: string[] = []

    for (const obj of $('li.novel-item', 'ul.novel-list').toArray()) {
        const image: string = $('img', obj).first().attr('data-src') ?? ''
        const title: string = $('img', obj).first().attr('alt') ?? ''
        const id = $('a', obj).attr('href')?.replace(/\/$/, '')?.split('/').pop() ?? ''
        const getChapter = $('div.novel-stats > strong', obj).text().trim()

        const chapNumRegex = getChapter.match(/(\d+\.?\d?)+/)
        let chapNum = 0
        if (chapNumRegex && chapNumRegex[1]) chapNum = Number(chapNumRegex[1])

        const subtitle = chapNum ? 'Chapter ' + chapNum : 'Chapter N/A'

        if (!id || !title || collectedIds.includes(id)) continue
        manga.push({
            mangaId: id,
            title: decodeHTMLEntity(title),
            imageUrl: image,
            subtitle: decodeHTMLEntity(subtitle)
        })
        collectedIds.push(id)
    }

    return manga
}

export const parseTags = ($: cheerio.Root): TagSection[] => {
    const arrayTags: Tag[] = []
    for (const tag of $('label.checkbox-inline', 'div.container').toArray()) {
        const label = $(tag).text().trim() ?? ''
        const id = $('input', tag).attr('value') ?? ''

        if (!id || !label) continue
        arrayTags.push({ id: id, label: label })
    }
    const tagSections: TagSection[] = [{ id: '0', label: 'genres', tags: arrayTags }]
    return tagSections
}

export const parseSearch = ($: cheerio.Root): SearchResultItem[] => {
    const mangas: SearchResultItem[] = []
    for (const obj of $('li.novel-item', 'ul.novel-list').toArray()) {

        let image: string = $('img', obj).first().attr('data-src') ?? ''
        if (image.startsWith('/')) image = 'https://www.mcreader.net' + image

        const title: string = $('img', obj).first().attr('alt') ?? ''
        const id = $('a', obj).attr('href')?.replace(/\/$/, '')?.split('/').pop() ?? ''
        const getChapter = $('div.novel-stats > strong', obj).text().trim()
        const chapNumRegex = getChapter.match(/(\d+\.?\d?)+/)

        let chapNum = 0
        if (chapNumRegex && chapNumRegex[1]) chapNum = Number(chapNumRegex[1])

        const subtitle = chapNum ? 'Chapter ' + chapNum : 'Chapter N/A'
        if (!id || !title) continue


        mangas.push({
            mangaId: id,
            title: decodeHTMLEntity(title),
            imageUrl: image,
            subtitle: decodeHTMLEntity(subtitle)
        })
    }
    return mangas
}

export const isLastPage = ($: cheerio.Root): boolean => {
    let isLast = false
    const pages: number[] = []

    for (const page of $('li', 'ul.pagination').toArray()) {
        const p = Number($(page).text().trim())
        if (isNaN(p)) continue
        pages.push(p)
    }

    const lastPage = Math.max(...pages)
    const currentPage = Number($('li.active').first().text())
    if (currentPage >= lastPage) isLast = true
    return isLast
}

const decodeHTMLEntity = (str: string): string => {
    return entities.decodeHTML(str)
}
