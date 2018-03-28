import { WrappedObject, DefinedPropertiesKey } from '../WrappedObject'
import { Document } from './Document'
import { toArray, getURLFromPath } from '../utils'
import { Types } from '../enums'
import { Factory } from '../Factory'
import { wrapObject } from '../wrapNativeObject'
import { ShareableObject } from './ShareableObject'

const AddStatus = {
  0: 'ok',
  1: 'the library has already been added',
  2: 'the document is not in the new JSON format',
  3: 'there was a problem reading the asset library file',
}

/**
 * A Sketch Library.
 */
export class Library extends WrappedObject {
  constructor(library = {}) {
    if (!library.sketchObject) {
      throw new Error('Cannot create a new Library directly')
    }

    super(library)
  }

  static getLibraries() {
    const libraryController = AppController.sharedInstance().librariesController()
    return toArray(libraryController.libraries()).map(
      Library.fromNative.bind(Library)
    )
  }

  static createLibraryFromDocument(document, path) {
    if (typeof document === 'string' && !path) {
      /* eslint-disable no-param-reassign */
      path = document
      document = undefined
      /* eslint-enable */
    }

    const libUrl = getURLFromPath(path)

    if (document) {
      const wrappedDocument = wrapObject(document)
      wrappedDocument.save(path)
    }

    const libraryController = AppController.sharedInstance().librariesController()
    const status = libraryController.addAssetLibraryAtURL(libUrl)

    if (status !== 0) {
      throw new Error(`Error while adding the library: ${AddStatus[status]}.`)
    }

    // refresh the UI
    libraryController.notifyLibraryChange(null)

    const lib = toArray(libraryController.userLibraries()).find(l =>
      l.locationOnDisk().isEqual(libUrl)
    )

    if (!lib) {
      throw new Error('could not find the added library')
    }

    return Library.fromNative(lib)
  }

  getDocument() {
    if (!this._object.document() && !this._object.loadSynchronously()) {
      throw new Error(`could not get the document: ${this._object.status}`)
    }
    return Document.fromNative(this._object.document())
  }

  getSymbolReferences() {
    try {
      const document = this.getDocument()

      return document
        .getSymbols()
        .map(s =>
          ShareableObject.fromNative(
            MSSymbolMasterReference.referenceForShareableObject_inLibrary(
              s.sketchObject,
              this._object
            )
          )
        )
    } catch (err) {
      return []
    }
  }

  remove() {
    const libraryController = AppController.sharedInstance().librariesController()
    libraryController.removeAssetLibrary(this._object)
  }
}

Library.type = Types.Library
Library[DefinedPropertiesKey] = { ...WrappedObject[DefinedPropertiesKey] }
Factory.registerClass(Library, MSAssetLibrary)

Library.define('id', {
  exportable: true,
  importable: false,
  get() {
    const id = this._object.libraryID()
    if (!id) {
      return undefined
    }
    return String(id)
  },
})

Library.define('name', {
  exportable: true,
  importable: false,
  get() {
    return String(this._object.name())
  },
})

Library.define('valid', {
  exportable: true,
  importable: false,
  get() {
    return !!this._object.valid()
  },
})

Library.define('enabled', {
  exportable: true,
  importable: false,
  get() {
    return !!this._object.enabled()
  },
})