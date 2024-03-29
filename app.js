'use strict'

const FOR_KEY = 'for'
const urlParams = new URLSearchParams(window.location.search)
const sinceParam = urlParams.get(FOR_KEY)
if (sinceParam) {
  sessionStorage.setItem(FOR_KEY, sinceParam)
}

// Global variables
const YEAR = sessionStorage.getItem(FOR_KEY) ? Number(sessionStorage.getItem(FOR_KEY)) : 2021
const DOMAIN = `${window.location.origin}`
const CANVAS_SIZES = [4, 9, 16, 25]
const DEFAULT_SIZE = 9
const ACTIVE_CLASS = 'active'
const PARAMS = new URLSearchParams(window.location.search)
const API_APP_ID = '2169639756532513'
const API_BASE = 'https://api.instagram.com/'
const TOKEN_URL = `${DOMAIN}/.netlify/functions/auth`
const loginParams = {
  client_id: API_APP_ID,
  response_type: 'code',
  scope: 'user_profile,user_media',
  redirect_uri: TOKEN_URL
}
const LOGIN_URL = `${API_BASE}oauth/authorize/?${new URLSearchParams(loginParams)}`
const API_ENDPOINT = 'https://graph.instagram.com/me/media/?fields=id,media_url,thumbnail_url,like_count,comments_count,timestamp'

// Set year
Array.from(document.querySelectorAll('.year')).forEach(item => item.innerText = YEAR)

// Set the initial view and render the app
window.onload = () => {
  if (PARAMS.get('token')) {
    renderView('loading', () => callbackPics(PARAMS.get('token')))
    history.replaceState('', document.title, DOMAIN)
    return true
  }

  return renderView('home', callbackHome)
}

const renderView = (view, callback) => {
  Array.from(document.querySelectorAll('.view')).forEach(el => hideElement(el))
  showElement(document.getElementById(view))

  if (callback) {
    callback()
  }
}

const callbackHome = () => {
  enableAuthButtons()
}

const callbackPics = (accessToken) => {
  document.getElementById('js-message').innerHTML = 'Hold tight, this could take a minute...'
  fetchMedia(accessToken)
    .then(createCollages)
    .then(displayCollages)
    .catch(displayError)
}

const fetchMedia = (accessToken) => {
  return new Promise((resolve, reject) => {
    getPostsFromYear(`${API_ENDPOINT}&access_token=${accessToken}`, YEAR).then(response => resolve(response))
  })
}

const enableAuthButtons = () => {
  Array.from(document.querySelectorAll('.js-login')).forEach((btn) => {
    btn.setAttribute('href', LOGIN_URL)
    btn.addEventListener('click', () => renderView('loading'))
  })
}

const createCollages = (media) => {
  if (!media || media.length === 0) {
    displayError('We could not retrieve any media for this year from your account.')
    return
  }
  
  const imagePromises = []
  const availableSizes = CANVAS_SIZES.filter(size => size <= media.length)

  availableSizes.forEach(canvasSize => { 
    const gutterWidth = 2
    let canvas = document.getElementById(`js-canvas--${canvasSize}`)
    const context = canvas.getContext('2d')
    const gridNum = Math.sqrt(canvasSize)
    const imageWidth = Math.floor(750 / gridNum)
    const canvasWidth = (imageWidth * gridNum) + ((gridNum - 1) * gutterWidth)

    canvas.width = canvasWidth
    canvas.height = canvas.width
    context.fillStyle = '#ffffff'
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.fillRect(0, 0, canvas.width, canvas.height)

    for (let i = 0; i < canvasSize; i++) {
      const item = media[i]
      const col = i % gridNum
      const row = Math.floor(i / gridNum)
      const posX =(imageWidth * col) + (gutterWidth * col)
      const posY = (imageWidth * row) + (gutterWidth * row)
      const url = item.thumbnail_url || item.media_url
      imagePromises.push(addMedia(context, url, posX, posY, imageWidth))
    }
  })

  return new Promise((resolve) => {
    Promise.all(imagePromises).then(responses => {
      resolve(true)
    })
  })
}

const displayCollages = () => {
  addDataURLs()
  updateCollageSrc(document.getElementById(`js-canvas--${DEFAULT_SIZE}`).dataset.url)
  document.getElementById(`js-tab--${DEFAULT_SIZE}`).classList.add(ACTIVE_CLASS)
  enableTabs()
  updateDownloadLinks(DEFAULT_SIZE)
  renderView('pics')
}

const getPostsFromYear = (endpoint, year, media = []) => {
  return fetch(endpoint)
    .then(response => response.json())
    .then(({data, paging}) => {
      const lastMediaYear = getMediaYear(data[data.length - 1].timestamp)
      const moreResults = paging.next && lastMediaYear > year - 1
      const newMedia = data.filter(media => getMediaYear(media.timestamp) === year)
      const updatedMedia = media
        .concat(newMedia)
        .sort((a, b) => b.like_count - a.like_count || b.comments_count - a.comments_count)
        .splice(0, 25)
      if (moreResults) {
        return getPostsFromYear(paging.next, year, updatedMedia)
      }

      return updatedMedia
    })
    .catch(err => displayError('There was a problem retrieving your media. Please ensure you grant permission to access your posts.'))
}

const addDataURLs = () => {
  Array.from(document.querySelectorAll('.js-canvas')).forEach((canvas) => {
    canvas.dataset['url'] = canvas.toDataURL('image/jpeg', 0.8).replace('image/jpeg', 'image/octet-stream')
  })
}

const updateCollageSrc = (src) => {
  document.getElementById('js-collage').src = src
}

const updateTabs = (activeId) => {
  document.querySelector('.js-tab.active').classList.remove(ACTIVE_CLASS)
  document.getElementById(activeId).classList.add(ACTIVE_CLASS)
}

const enableTabs = () => {
  document.querySelector('.js-tabs').addEventListener('click', event => {
    if (event.target.matches('.js-tab')) {
      updateTabs(event.target.id)
      updateCollageSrc(document.getElementById(`js-canvas--${event.target.dataset.pics}`).dataset.url)
      updateDownloadLinks(event.target.dataset.pics)
    }
  })
}

const addMedia = (ctx, url, posX, posY, w) => {
  return new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      const crop = Math.min(image.width, image.height)
      ctx.drawImage(image, image.width / 2 - crop / 2, image.height / 2 - crop / 2, crop, crop, posX, posY, w, w)
      return resolve(image)
    }
    image.src = url
  })
}

const getMediaYear = date => new Date(date).getFullYear()

const updateDownloadLinks = (num) => {
  Array.from(document.querySelectorAll('.js-download')).forEach(el => {
    el.href = document.getElementById(`js-canvas--${num}`).dataset.url
    el.download = `MyTop${num}of${YEAR}.jpg`
  })
}

const hideElement = (view) => {
  view.setAttribute('hidden', 'hidden')
}

const showElement = (view) => {
  view.removeAttribute('hidden')
}

const displayError = (error) => {
  renderView('error', () => {
    document.getElementById('js-error').innerText = error
    enableAuthButtons()
  })
  throw new Error(error)
}
