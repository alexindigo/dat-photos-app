(async  function () {
  // render prompt if not using Beaker
  if (!navigator.userAgent.includes('BeakerBrowser')) {
    renderUAPrompt()
    return
  }

  // setup
  let archive, archiveInfo, albums
  let selectedImages = []

  const shareBtn = document.getElementById('share-btn')
  shareBtn.addEventListener('click', onShare)

  try {
    archive = new DatArchive(window.location)
    archiveInfo = await archive.getInfo()
    albums = JSON.parse(await archive.readFile('albums.json'))
  } catch (err) {
    renderPrompt('<p>Something went wrong.</p><a href="https://github.com/taravancil/p2p-photo-gallery">Report an issue</a>')
  }

  // render fork prompt if user is not owner
  if (!archiveInfo.isOwner) {
    renderForkPrompt()
    document.getElementById('fork-button').addEventListener('click', onForkApp)
    return
  }

  renderApp()

  // events

  async function onForkApp () {
    // Wait for the archive's files to download
    // TODO handle timeout
    await archive.download('/')

    // Fork the app and open the forked version
    myApp = await DatArchive.fork(archive, {title: 'My Photos'})
    window.location = myApp.url
  }

  function onSelectImage (e) {
    e.target.classList.add('selected')
    shareBtn.disabled = false

    // full src is dat://{key}/{path}, so strip dat://{key}
    selectedImages.push(e.target.src.slice('dat://'.length + 64))
  }

  function onToggleSelected (e) {
    e.target.classList.toggle('selected')

    // full src is dat://{key}/{path}, so strip dat://{key}
    const path = e.target.src.slice('dat://'.length + 64)
    const idx = selectedImages.indexOf(path)

    // either add or remove the path to selectedImages
    if (idx === -1) selectedImages.push(path)
    else selectedImages.splice(idx, 1)

    if (selectedImages.length) shareBtn.disabled = false
    else shareBtn.disabled = true
  }

  async function onCreateAlbum (e) {
    // create a new Dat archive
    const album = await DatArchive.create()
    const info = await album.getInfo()

    // create the /images directory
    await album.mkdir('/images')

    // write the albums URL to albums.json
    albums.push(album.url)
    await archive.writeFile('albums.json', JSON.stringify(albums))

    let imagesHTML = ''

    const styles = '<style>body{font-family:BlinkMacSystemFont;}img{max-width: 225px; margin-right: 10px;}</style>'

    for (let i = 0; i < selectedImages.length; i++) {
      const path = selectedImages[i]
      const data = await archive.readFile(path, 'binary')
      imagesHTML += `<img src='${path}'/>`
      await newArchive.writeFile(path, data)
    }

    // write the index.html preview
    await newArchive.writeFile('index.html', `<html>${styles}<h1>${info.title || ''}</h1><p>${info.description || ''}</p>${imagesHTML}</html>`)
    await newArchive.commit()

    // go to the new archive
    window.location = album.url
  }

  async function onDeleteSelected () {
    for (let i = 0; i < selectedImages.length; i++) {
      const path = selectedImages[i]

      // remove from DOM
      document.querySelector(`[src='${path}']`).remove()

      // remove from archive
      await archive.unlink(selectedImages[i], 'binary')
    }
    await archive.commit()

    // disable share button, since all selected photos were deleted
    shareBtn.disabled = true
  }

  // renderers

  function renderApp () {
    // clear the prompt
    updatePrompt('')
    renderAlbums()

    document.getElementById('more-btn').addEventListener('click', function (e) {
      document.querySelector('.more-dropdown').classList.toggle('visible')
    })

    document.getElementById('delete-selected').addEventListener('click', onDeleteSelected)

    document.querySelector('input[type="file"]').addEventListener('change', function (e) {
      if (e.target.files) {
        const {files} = e.target

        for (let i = 0; i < files.length; i += 1) {
          const reader = new FileReader()
          const file = files[i]

          reader.onload = async function () {
            const path = `/images/${file.name}`

            // only write the file if it doesn't already exist
            try {
              await archive.stat(path)
            } catch (e) {
              await archive.writeFile(path, reader.result)
              await archive.commit()
              appendImage(path)
            }
          }

          reader.readAsArrayBuffer(file)
        }
      }
    })*/
  }

  function renderAlbums () {
    for (let i = 0; i < albums.length; i++) {
      appendAlbum(new DatArchive(albums[i]))
    }
  }

  async function appendAlbum (album) {
    const info = await album.getInfo()
    let albumHTML = ''

    // get the count of images in the album
    const images = await album.readdir('/images')

    // create the album element
    const el = document.createElement('div')
    el.classList.add('album')

    if (!images.length) {
      el.classList.add('empty')
      albumHTML += '<div class="placeholder">No photos</div>'
    } else {
      // add the first image to the album preview
      albumHTML += `<img src="dat://${album.url}${images[0]}"/>`
    }

    // add the title
    albumHTML += `<div class="title">${info.title || '<em>Untitled</em>'}</div>`

    // add the image count to the HTML
    albumHTML += `<div class="photo-count">${images.length} photos</div>`

    el.innerHTML = albumHTML

    document.querySelector('.albums-container').appendChild(el)
  }

  async function renderGallery () {
    try {
      const paths = await archive.readdir('images')

      // TODO sort by ctime or mtime
      for (let i = 0; i < paths.length; i++) {
        appendImage(`/images/${paths[i]}`)
      }
    } catch (err) {
      updatePrompt('<p>Something went wrong</p>')
      console.error(err)
    }
  }

  function renderUAPrompt () {
    updatePrompt('<p>Sorry >.< This app only works in the Beaker Browser.</p><a class="btn primary" href="https://beakerbrowser.com/docs/install/">Install Beaker</a>')
  }

  function renderForkPrompt () {
    updatePrompt('<p>Welcome to Photos!</p><button id="fork-button" class="btn primary">Get started</button>')
  }

  function appendImage(src) {
    if (typeof src !== 'string') return

    const img = document.createElement('img')
    img.src = src
    img.addEventListener('click', onToggleSelected)
    document.querySelector('.gallery-images').appendChild(img)
  }

  // helpers

  function updatePrompt (html) {
    if (typeof html !== 'string') return
    if (html.length) {
      document.querySelector('#prompt').innerHTML = `<div class="content">${html}</div>`
    } else {
      document.querySelector('#prompt').innerHTML = html
    }
  }

  // TODO omit?
  function createImageEl (src) {
    const img = document.createElement('img')
    img.src = src
    return img
  }
})()