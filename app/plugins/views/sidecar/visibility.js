/*
 * Copyright 2017 IBM Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * This plugin helps with controlling and knowing the state of the sidecar
 *
 */

const hide = clearSelectionToo => {
    console.log('repl::hide sidecar')
    const sidecar = document.querySelector('#sidecar')
    sidecar.className = (sidecar.className || '').replace(/visible/g, '')

    const replView = document.querySelector('#main-repl')
    replView.className = (replView.className || '').replace(/sidecar-visible/g, '')

    // we just hid the sidecar. make sure the current prompt is active for text input
    ui.getCurrentPrompt().focus()

    // were we asked also to clear the selection?
    if (clearSelectionToo && sidecar.entity) {
        delete sidecar.entity
    }

    return true
}

const show = (block, nextBlock) => {
    console.log('repl::show sidecar')
    const sidecar = document.querySelector('#sidecar')
    if (sidecar.entity || sidecar.className.indexOf('custom-content') >= 0) {
        sidecar.setAttribute('class', `visible ${(sidecar.getAttribute('class') || '').replace(/visible/g, '')}`)

        repl.scrollIntoView()
        const replView = document.querySelector('#main-repl')
        replView.className = `sidecar-visible ${(replView.getAttribute('class') || '').replace(/sidecar-visible/g, '')}`

        return true
    } else {
        ui.oops(block, nextBlock)({ error: 'You have no entity to show' })
    }
}

const isVisible = () => {
    const sidecar = document.querySelector('#sidecar')
    return sidecar.className.indexOf('visible') >= 0 && sidecar
}

module.exports = commandTree => {
    //commandTree.listen('/hide', hide)
    //commandTree.listen('/show', show)

    return {
        isVisible: isVisible,
        hide: hide,
        show: show,
        toggle: () => isVisible() ? hide() : show()
    }
}
