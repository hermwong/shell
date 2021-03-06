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

const common = require('../../../lib/common'),
      openwhisk = require('../../../lib/openwhisk'),
      ui = require('../../../lib/ui'),
      assert = require('assert'),
      isUrl = require('is-url'),
      fs = require('fs'),
      path = require('path'),
      badges = require(path.join(__dirname, '../../../../app/plugins/modules/composer/lib/badges.js')),
      keys = ui.keys,
      cli = ui.cli,
      sidecar = ui.sidecar,
      actionName1 = 'foo1',
      actionName2 = 'foo2',
      actionName3 = 'foo3',
      seqName1 = 'seq1',
      seqName2 = 'seq2',
      seqName3 = 'seq3',
      srcDir = './data/composer-source'  // inputs for create-from-source

/**
 * this test covers app create error handling, and app create --dry-run
 *
 */
describe('app create error handling and app create --dry-run', function() {
    before(common.before(this))
    after(common.after(this))

    it('should have an active repl', () => cli.waitForRepl(this.app))

    it('should reject unknown option --mojo', () => cli.do('app create demos/if.js --mojo', this.app)
        .then(cli.expectError(0, 'Unexpected option mojo'))
       .catch(common.oops(this)))

    it('should reject unknown option --mojo', () => cli.do('app create zombie demos/if.js --mojo', this.app)
        .then(cli.expectError(0, 'Unexpected option mojo'))
       .catch(common.oops(this)))

    it('should reject unknown option -m', () => cli.do('app create demos/if.js -m', this.app)
        .then(cli.expectError(0, 'Create an app from a given source file')) // beginning of usage, because we didn't pass an app name
       .catch(common.oops(this)))

    it('should reject unknown option -m', () => cli.do('app create zombie demos/if.js -m', this.app)
        .then(cli.expectError(0, 'Invalid memory limit: expected integer, but got nothing.'))
       .catch(common.oops(this)))

    it('should fail to initialize composer, due to bogus option', () => cli.do(`app init --nope`, this.app)
        .then(cli.expectError(0, 'Unexpected option nope'))
       .catch(common.oops(this)))

    const dryRunOk = 'data/composer-source/if.js',
          badDir = 'data/composer-source-expect-errors',
          dryRunBad = [ { input: `${badDir}/error1.js`, err: `SLACK_TOKEN required in environment.` },
                        { input: `${badDir}/nofsm.js`, err: `Your source code did not produce a valid app.` },
                        { input: `${badDir}/t2s.js`, err: `ReferenceError: slackConfig is not defined
    at t2s.js:17:19
    at t2s.js:22:3` },
                        { input: `${badDir}/if-bad.js`, err: `if-bad.js:2
  /* cond */ 'authenticate',,  /* double comma, expect parse error */
                            ^
SyntaxError: Unexpected token ,` }]

    it(`should dry-run check ${dryRunOk} with -n`, () => cli.do(`app create ${dryRunOk} -n`, this.app)
        .then(cli.expectOKWithCustom({expect: 'Your code compiles without error'}))
       .catch(common.oops(this)))
    it(`should dry-run check ${dryRunOk} with --dry-run`, () => cli.do(`app create ${dryRunOk} --dry-run`, this.app)
        .then(cli.expectOKWithCustom({expect: 'Your code compiles without error'}))
       .catch(common.oops(this)))
    dryRunBad.forEach( ({input, err}) => {
        it(`should dry-run check with expected error ${input} --dry-run`, () => cli.do(`app create ${input} --dry-run`, this.app)
            .then(cli.expectError(0, err))
           .catch(common.oops(this)))
    })

    // check file not found error handling
    it(`should fail properly with ENOENT`, () => cli.do(`app create goober.js -n`, this.app)
        .then(cli.expectError('ENOENT'))
       .catch(common.oops(this)))
    it(`should fail properly with ENOENT`, () => cli.do(`app create goober.js --dry-run`, this.app)
        .then(cli.expectError('ENOENT'))
       .catch(common.oops(this)))
    it(`should fail properly with ENOENT`, () => cli.do(`app create goober goober.js`, this.app)
        .then(cli.expectError('ENOENT'))
       .catch(common.oops(this)))

})
