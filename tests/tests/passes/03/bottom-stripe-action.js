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

//
// tests that create an action and test that it shows up in the list UI
//    this test also covers toggling the sidecar
//
const common = require('../../../lib/common'),
      openwhisk = require('../../../lib/openwhisk'),
      ui = require('../../../lib/ui'),
      assert = require('assert'),
      keys = ui.keys,
      cli = ui.cli,
      sidecar = ui.sidecar,
      actionName = 'foo',
      actionName2 = 'foo2',
      actionName3 = 'foo3'

// so we can compare the content of code mode
const fs = require('fs'),
      fooSrc = fs.readFileSync('./data/foo.js').toString(),
      foo2Src = fs.readFileSync('./data/foo2.js').toString()

describe('Sidecar bottom stripe interactions for actions', function() {
    before(common.before(this))
    after(common.after(this))

    
    /** verify the mode buttons work */
    const verify = (name, expectedParams, expectedAnnotations, expectedSrc) => {
        // click on parameters mode button
        it(`should show parameters for ${name} by clicking on bottom stripe`, () => this.app.client.click(ui.selectors.SIDECAR_MODE_BUTTON('parameters'))
           .then(() => this.app)
           .then(sidecar.expectOpen)
           .then(sidecar.expectShowing(name))
           .then(app => app.client.getText(`${ui.selectors.SIDECAR_CONTENT} .action-source`))
           .then(ui.expectStruct(expectedParams))
           .catch(common.oops(this)))

        // click on annotations mode button
        it(`should show annotations for ${name} by clicking on bottom stripe`, () => this.app.client.click(ui.selectors.SIDECAR_MODE_BUTTON('annotations'))
           .then(() => this.app)
           .then(sidecar.expectOpen)
           .then(sidecar.expectShowing(name))
           .then(app => app.client.getText(`${ui.selectors.SIDECAR_CONTENT} .action-source`))
           .then(ui.expectSubset(expectedAnnotations))
           .catch(common.oops(this)))

        // click on code mode button
        it(`should show annotations for ${actionName} by clicking on bottom stripe`, () => this.app.client.click(ui.selectors.SIDECAR_MODE_BUTTON('code'))
           .then(() => this.app)
           .then(sidecar.expectOpen)
           .then(sidecar.expectShowing(name))
           .then(app => app.client.getText(`${ui.selectors.SIDECAR_CONTENT} .action-source`))
           .then(code => assert.equal(code.replace(/\s+/g, ''), expectedSrc.replace(/\s+/g, '')))
           .catch(common.oops(this)))
    }


    it('should have an active repl', () => cli.waitForRepl(this.app))

    // create an action, using the implicit entity type
    it(`should create an action ${actionName}`, () => cli.do(`create ${actionName} ./data/foo.js -p x 5 -p y 10 -a aaa 888`, this.app)
       .then(cli.expectOK)
       .then(sidecar.expectOpen)
       .then(sidecar.expectShowing(actionName))
       .catch(common.oops(this)))

    // create an action, using the implicit entity type
    it(`should create an action ${actionName2}`, () => cli.do(`create ${actionName2} ./data/foo2.js -p x 6 -p y 11 -a aaa 999`, this.app)
       .then(cli.expectOK)
       .then(sidecar.expectOpen)
       .then(sidecar.expectShowing(actionName2))
       .catch(common.oops(this)))

    verify(actionName2, {x:6,y:11}, {aaa:999}, foo2Src)

    it(`should get ${actionName}`, () => cli.do(`action get ${actionName}`, this.app)
       .then(cli.expectOK)
       .then(sidecar.expectOpen)
       .then(sidecar.expectShowing(actionName))
       .catch(common.oops(this)))

    verify(actionName, {x:5,y:10}, {aaa:888}, fooSrc)
})
