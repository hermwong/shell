const common = require('./common'),
      util = require('util'),
      assert = require('assert'),
      timeout = process.env.TIMEOUT || 60000,
      constants = {
          API_HOST: process.env.API_HOST || 'openwhisk.ng.bluemix.net',
	  CLI_PLACEHOLDER: process.env.CLI_PLACEHOLDER || 'enter your command',
	  OK: process.env.OK || 'ok'
      },
      
      keys = {
	  ENTER: '\uE007',
	  ESCAPE: '\uE00C'
      }

exports.keys = keys

exports.aliases = {
    activation: ["activation", "$"],
    list: ["ls", "list"],
    remove: ["rm", "delete"]
}

const selectors = {
    APIHOST: '#openwhisk-api-host',
    NAMESPACE: '#openwhisk-namespace',
    SIDECAR_BASE: '#sidecar',
    PROMPT_BLOCK: '#main-repl .repl-block',
    OOPS: '#main-repl .repl-block .oops'
}
selectors.SIDECAR = `${selectors.SIDECAR_BASE}.visible`,
selectors.SIDECAR_WITH_FAILURE = `${selectors.SIDECAR_BASE}.visible.activation-success-false`,
selectors.SIDECAR_HIDDEN = `${selectors.SIDECAR_BASE}:not(.visible)`,
selectors.SIDECAR_ACTIVATION_TITLE = `${selectors.SIDECAR} .sidecar-header-name .activation-id`,
selectors.SIDECAR_TITLE = `${selectors.SIDECAR} .sidecar-header-name-content .entity-name`,
selectors.SIDECAR_PACKAGE_NAME_TITLE = `${selectors.SIDECAR} .sidecar-header-name-content .package-prefix`,
selectors.SIDECAR_CONTENT = `${selectors.SIDECAR} .sidecar-content`,
selectors.SIDECAR_WEB_ACTION_URL = `${selectors.SIDECAR} .sidecar-header .entity-web-export-url.has-url`
selectors.SIDECAR_ACTION_SOURCE = `${selectors.SIDECAR_CONTENT} .action-content .action-source`,
selectors.SIDECAR_ACTIVATION_RESULT = `${selectors.SIDECAR_CONTENT} .activation-result`,
selectors.SIDECAR_ACTIVATION_ID = `${selectors.SIDECAR} .sidecar-header .activation-id`,
selectors.SIDECAR_RULE_CANVAS = `${selectors.SIDECAR} .rule-components`
selectors.SIDECAR_RULE_CANVAS_NODES = `${selectors.SIDECAR_RULE_CANVAS} .sequence-component`,
selectors.SIDECAR_SEQUENCE_CANVAS = `${selectors.SIDECAR} .sequence-components`
selectors.SIDECAR_SEQUENCE_CANVAS_NODES = `${selectors.SIDECAR_SEQUENCE_CANVAS} .sequence-component`,
selectors.SIDECAR_SEQUENCE_CANVAS_NODE_N = N => `${selectors.SIDECAR_SEQUENCE_CANVAS} .sequence-component-${N}`,
selectors.SIDECAR_LIMIT = type => `${selectors.SIDECAR} .sidecar-header .limits .limit[data-limit-type="${type}"]`
selectors.SIDECAR_BADGES = `${selectors.SIDECAR} .sidecar-header .badges`
selectors.SIDECAR_CUSTOM_CONTENT = `${selectors.SIDECAR} .custom-content`
selectors.SIDECAR_MODE_BUTTONS = `${selectors.SIDECAR} .sidecar-bottom-stripe .sidecar-bottom-stripe-button` // all mode buttons in the bottom stripe
selectors.SIDECAR_MODE_BUTTON = mode => `${selectors.SIDECAR_MODE_BUTTONS}[data-mode="${mode}"]` // specific mode button in the bottom stripe
selectors.SIDECAR_BACK_BUTTON = `${selectors.SIDECAR} .sidecar-bottom-stripe-back-button` // back button in the bottom stripe
selectors.SIDECAR_CLOSE_BUTTON = `${selectors.SIDECAR} .sidecar-bottom-stripe-close` // close button in the bottom stripe
selectors.PROCESSING_PROMPT_BLOCK = `${selectors.PROMPT_BLOCK}.repl-active`,
selectors.CURRENT_PROMPT_BLOCK = `${selectors.PROMPT_BLOCK}.repl-active`,
selectors.PROMPT_BLOCK_N = N => `${selectors.PROMPT_BLOCK}[data-input-count="${N}"]`
selectors.CURRENT_PROMPT = `${selectors.CURRENT_PROMPT_BLOCK} input`
selectors.PROMPT_N = N => `${selectors.PROMPT_BLOCK_N(N)} input`
selectors.OUTPUT_N = N => `${selectors.PROMPT_BLOCK_N(N)} .repl-result`
selectors.LIST_RESULTS_N = N => `${selectors.PROMPT_BLOCK_N(N)} .repl-result .entity`
selectors.LIST_RESULTS_BY_NAME_N = N => `${selectors.LIST_RESULTS_N(N)} .entity-name`
selectors.LIST_RESULT_BY_N_AND_NAME = (N,name) => `${selectors.LIST_RESULTS_N(N)}[data-name="${name}"] .entity-name`
selectors.OK_N = N => `${selectors.PROMPT_BLOCK_N(N)} .repl-output .ok`
exports.selectors = selectors

const expectOK = (appAndCount, opt) => {
    // appAndCount.count is the prompt index of this command... so +1 gives us the next prompt, whose existence signals that this command has finished
    const app = appAndCount.app
    const N = appAndCount.count + 1

    return app.client.waitForVisible(selectors.PROMPT_N(N), timeout)                        // wait for the next prompt to appear
	.then(nextPrompt => app.client.getAttribute(selectors.PROMPT_N(N), 'placeholder'))  // it should have a placeholder text
	.then(attr => assert.equal(attr, constants.CLI_PLACEHOLDER))                        //      ... verify that
	.then(() => app.client.getValue(selectors.PROMPT_N(N), timeout))                    // it should have an empty value
	.then(promptValue => { if (promptValue.length !== 0) { console.error(promptValue) } return promptValue })
	.then(promptValue => assert.equal(promptValue.length, 0))                           //      ... verify that
	.then(() => opt && opt.expectError ? false : app.client.getText(selectors.OK_N(N - 1), timeout))   // get the "ok" part of the current command
	.then(ok => opt && opt.expectError ? false : assert.equal(ok, constants.OK))                       // make sure it says "ok" !
	.then(() => {
	    // validate any expected list entry
	    if (typeof opt === 'string') {
		// expect exactly one entry
		return app.client.getText(selectors.LIST_RESULTS_BY_NAME_N(N - 1))
		    .then(name => assert.equal(name, opt))
	    } else if (util.isArray(opt)) {
		// expect several entries, of which opt is one
		return app.client.getText(selectors.LIST_RESULTS_BY_NAME_N(N - 1))
		    .then(name => assert.ok(name !== opt[0] && name.indexOf(opt[0]) >= 0))
	    } else if (opt && (opt.selector || opt.expect)) {
		// more custom, look for expect text under given selector
		const selector = `${selectors.OUTPUT_N(N - 1)} ${opt.selector || ''}`
                if (opt.elements) {
                    return app.client.elements(selector)
                } else {
		    return app.client.getText(selector)
		        .then(txt => {
                            if (opt.exact) assert.equal(txt, opt.expect)
                            else if (opt.expect) {
                                if (txt.indexOf(opt.expect) < 0) {
                                    console.error(`Expected string not found expected=${opt.expect} actual=${txt}`)
                                    assert.ok(txt.indexOf(opt.expect) >= 0)
                                }
                            }

			    return opt.passthrough ? N-1 : selector // so that the caller can inspect the selector in more detail
		        })
                }
	    } else {
		// nothing to validate with the "console" results of the command
                // return the index of the last executed command
                return N - 1
	    }
	})
	.then(res => opt && (opt.selector || opt.passthrough) ? res : app) // return res rather than app, if requested
	.catch(err => {
	    console.log(err)
	    common.oops({ app: app })(err)
	    return expectOK(appAndCount, opt)
	})
}

exports.cli = {
    /** execute a CLI command, and return the data-input-count of that command */
    do: (cmd, app, noNewline) => app.client.waitForExist(selectors.CURRENT_PROMPT_BLOCK)
        .then(() => app.client.getAttribute(selectors.CURRENT_PROMPT_BLOCK, 'data-input-count'))
        .then(count => app.client.getValue(selectors.CURRENT_PROMPT)
              .then(currentValue => app.client.setValue(selectors.CURRENT_PROMPT, `${currentValue}${cmd}`))
              .then(() => { if (!noNewline) app.client.execute('repl.eval()') })
	      .then(() => ({ app: app, count: parseInt(count) }))),

    paste: (cmd, app, nLines = 1) => app.client.waitForExist(selectors.CURRENT_PROMPT_BLOCK)
        .then(() => app.client.getAttribute(selectors.CURRENT_PROMPT_BLOCK, 'data-input-count'))
	.then(count => app.electron.clipboard.writeText(cmd)
              .then(() => app.client.execute(() => document.execCommand('paste')))
	      .then(() => ({ app: app, count: parseInt(count) + nLines - 1 }))),

    /** wait for the repl to be active */
    waitForRepl: (app, prefs={}) => app.client.waitForExist(selectors.CURRENT_PROMPT, timeout)
        .then(() => app.client.waitForText(selectors.APIHOST, timeout))
        .then(() => app.client.getText(selectors.APIHOST))
        .then(apihost => assert.equal(apihost.toLowerCase(), (prefs.API_HOST || constants.API_HOST).toLowerCase()))
        .then(() => {
            if (!prefs || !prefs.noAuthOk) {
                return app.client.waitForText(selectors.NAMESPACE, timeout)
                    .then(() => app.client.getText(selectors.NAMESPACE))
                    .then(exports.validateNamespace)
            }
        })
        .then(() => app),

    /**
     * look at the repl-context and repl-selection after a cli.do (which is the `res` part)
     *   getHTML lets us inspect the contents of potentially invisible elements
     */
    expectContext: (expectedContext, expectedSelection) => res => exports.cli.expectOKWithCustom({ passthrough: true })(res)
        .then(N => Promise.all([res.app.client.getHTML(`${selectors.PROMPT_BLOCK_N(N + 1)} .repl-context`),
                                res.app.client.getHTML(`${selectors.PROMPT_BLOCK_N(N + 1)} .repl-selection`)])
              .then(pair => assert.ok(expectedContext === undefined|| pair[0].indexOf(expectedContext)>=0) && (expectedSelection === undefined || pair[1].indexOf(expectedSelection) >=0 )))
        .then(() => res.app),

    /** close sidecar, then expectContext, then open sidecar */
    /*expectContextWithToggle: (expectedContext, expectedSelection) => res => {
        return exports.sidecar.doClose(res.app).then(() => res)
            .then(exports.cli.expectContext(expectedContext, expectedSelection))
            .then(exports.sidecar.doOpen)
            .then(() => res.app)
    },*/
    
    /** wait for the result of a cli.do */
    makeCustom: (selector, expect, exact) => ({ selector: selector, expect: expect, exact: exact }),
    expectError: (statusCode, expect) => res => expectOK(res, { selector: `.oops[data-status-code="${statusCode||0}"]`, expectError: true, expect: expect }).then(() => res.app),
    expectBlank: res => expectOK(res, { selector: '', expectError: true }),
    expectOKWithCustom: custom => res => expectOK(res, custom),        // as long as its ok, accept anything
    expectOKWithAny: res => expectOK(res),                             // as long as its ok, accept anything
    expectOKWithOnly: entityName => res => expectOK(res, entityName),  // expect ok and *only* the given result value
    expectOKWith: entityName => res => expectOK(res, [entityName]),    // expect ok and at least the given result value
    expectOK: res => expectOK(res, { passthrough: true }).then(N => res.app.client.elements(selectors.LIST_RESULTS_BY_NAME_N(N))).then(elts => assert.equal(elts.value.length, 0)).then(() => res.app),
    expectJustOK: res => expectOK(res, true)                           // expect just ok, and no result value
}

exports.sidecar = {
    expectOpen: app => app.client.waitForVisible(selectors.SIDECAR, timeout).then(() => app),
    expectOpenWithFailure: app => app.client.waitForVisible(selectors.SIDECAR_WITH_FAILURE, timeout).then(() => app),

    expectClosed: app => app.client.waitForExist(selectors.SIDECAR_HIDDEN, timeout)
	.then(() => app),

    expectSource: expectedSource => app => app.client.getText(selectors.SIDECAR_ACTION_SOURCE)
        .then(actualSource => assert.equal(actualSource.replace(/\s+/g, ''), expectedSource.replace(/\s+/g, '')))
        .then(() => app),

    expectBadge: badge => app => app.client.getText(selectors.SIDECAR_BADGES)
        .then(badges => assert.ok(badges.indexOf(badge) >= 0))
        .then(() => app),

    expectLimit: (type, expectedValue) => app => {
        const expect = {}
        expect[type] = expectedValue

        return app.client.click(selectors.SIDECAR_MODE_BUTTON('limits'))
            .then(() => app.client.getText(selectors.SIDECAR_ACTION_SOURCE))
            .then(exports.expectSubset(expect))
    },

    expectSequence: (A, selector=selectors.SIDECAR_SEQUENCE_CANVAS_NODES) => app => app.client.waitUntil(() => {
        return app.client.getText(selector)
            .then(B => {
                // console.log('Expecting ', A, B, new Date())
                if (B.length !== A.length) return false
                for (let idx = 0; idx < A.length; idx++) {
                    if (B[idx].replace(/\s+/g, '') !== A[idx].replace(/\s+/g, '')) {
                        return false
                    }
                }
                return true
            })
    }),

    /** helper method to close the sidecar */
    doClose: function(app) {
        return exports.sidecar.expectOpen(app)
            .then(() => app.client.keys(keys.ESCAPE))
            .then(() => app)
            .then(exports.sidecar.expectClosed)
    },
    doOpen: function(app) {
        return exports.sidecar.expectClosed(app)
            .then(() => app.client.keys(keys.ESCAPE))
            .then(() => app)
            .then(exports.sidecar.expectOpen)
    },
    close: function(ctx) {
        it('should toggle closed the sidecar', () => exports.sidecar.doClose(ctx.app))
    },

    expectShowing: (expectedName, expectedActivationId, expectSubstringMatchOnName=false, expectedPackageName, expectType) => app => app.client.waitUntil(() => {
	// check selected name in sidecar
        return app.client.waitForVisible(`${selectors.SIDECAR}${!expectType ? '' : '.entity-is-' + expectType}`)
            .then(() => app.client.waitForText(selectors.SIDECAR_TITLE, timeout))
	    .then(() => app.client.getText(selectors.SIDECAR_TITLE))
	    .then(name => {
                const nameMatches = expectSubstringMatchOnName ? name.indexOf(expectedName) >= 0 || expectedName.indexOf(name) >= 0 : name === expectedName
                if (nameMatches) {
                    if (expectedPackageName) {
                        return app.client.getText(selectors.SIDECAR_PACKAGE_NAME_TITLE)
	                    .then(name => expectSubstringMatchOnName ? name.search(new RegExp(expectedPackageNameName, 'i')) >= 0 : name.toLowerCase() === expectedPackageName.toLowerCase())
                    } else {
                        return true
                    }
                }
            })
    }, timeout, `expect action name ${expectedName} in sidecar substringOk? ${expectSubstringMatchOnName}`)
	.then(() => {
	    // check selectd activation id in sidecar
	    if (expectedActivationId) {
		return app.client.waitUntil(() => app.client.waitForText(selectors.SIDECAR_ACTIVATION_TITLE, timeout)
					    .then(() => app.client.getText(selectors.SIDECAR_ACTIVATION_TITLE))
					    .then(id => id === expectedActivationId),
					    timeout, 'expect activation id ${expectedActivationId} in sidecar')
	    }
	})
	.then(() => app)
}
exports.sidecar.expectRule = A => exports.sidecar.expectSequence(A, selectors.SIDECAR_RULE_CANVAS_NODES)

/** is the given struct2 the same as the given struct2 (given as a string) */
exports.expectStruct = struct1 => string => {
    try {
        assert.ok(sameStruct(struct1, JSON.parse(string)))
        return true
    } catch (err) {
        console.error('Error comparing structs for actual value= ' + string)
        throw err
    }
}
exports.expectSubset = struct1 => string => {
    try {
        assert.ok(sameStruct(struct1, JSON.parse(string), true))
        return true
    } catch (err) {
        console.error('Error comparing subset for actual value= ' + string)
        throw err
    }
}

/** is the given actual array the same as the given expected array? */
exports.expectArray = expected => actual => {
    return assert.ok(actual.length === expected.length
              && actual.every(function(u, i) {
                  return u === expected[i]
              }))
}

/**
 * subset means that it is ok for struct1 to be a subset of struct2
 * so: every key in struct1 must be in struct2, but not vice versa
 *
 */
const sameStruct = (struct1, struct2, subset = false) => {
    if (struct1 === struct2) {
        return true
    }

    for (let key in struct1) {
        if (!(key in struct2)) {
	    console.log(`!(${key} in struct2)`)
            return false

        } else if (typeof struct1[key] === 'function') {
            // then we have a validator function
            if (!struct1[key](struct2[key])) {
                return false
            }

        } else if (typeof struct1[key] !== typeof struct2[key]) {
	    console.log(`typeof struct1[${key}] !== typeof struct2[${key}] ${typeof struct1[key]} ${typeof struct2[key]}`)
            return false
        } else if (typeof struct1[key] === 'object') {
            if (!sameStruct(struct1[key], struct2[key])) {
                return false
            }
        } else if (struct1[key] !== struct2[key]) {
	    console.log(`struct1[${key}] !== struct2[${key}] ${struct1[key]} ${struct2[key]}`)
            return false
        }
    }

    // if struct1 if expected to be a subset of struct2, then we're done
    if (subset) return true

    for (let key in struct2) {
        if (!(key in struct1)) {
	    console.log(`!(${key} in struct1)`)
            return false

        } else if (typeof struct1[key] === 'function') {
            // then we have a validator function
            if (!struct1[key](struct2[key])) {
                return false
            }

        } else if (typeof struct1[key] !== typeof struct2[key]) {
	    console.log(`typeof struct1[${key}] !== typeof struct2[${key}] ${typeof struct1[key]} ${typeof struct2[key]}`)
            return false
        } else if (typeof struct2[key] === 'object') {
            if (!sameStruct(struct1[key], struct2[key])) {
                return false
            }
        } else if (struct1[key] !== struct2[key]) {
	    console.log(`struct1[${key}] !== struct2[${key}] ${struct1[key]} ${struct2[key]}`)
            return false
        }
    }
    return true
}

/** validate an activationId */
const activationIdPattern = /^\w{12}$/
exports.expectValidActivationId = () => activationId => activationId.match(activationIdPattern)

/**
 * Normalize data for conformance testing of an HTML file
 *
 */
exports.normalizeHTML = s => {
    return s.toString()
        .replace(/https:\/\/[^/]+/g, '') // strip out any hostnames that may vary
        .replace(/>\s+</g, '><')         // remove white-space between tags
        .replace(/"/g, '\'')             // convert to single quotes
        .replace(/href=(['"])([^'"]+).css(['"])/, href='href=$1$2.http$3')
}

/**
 * @return the expected namespace string for this test
 *
 */
exports.expectedNamespace = (space=process.env.TEST_SPACE, org=process.env.TEST_ORG) => {
    if (!org || org.length === 0) {
        return space
    } else {
        return `${org}_${space}`
    }
}

/**
 * Valdiate that the observed namespace matches the expected namespace
 * for this test
 *
 */
exports.validateNamespace = observedNamespace => {
    assert.equal(observedNamespace.toLowerCase(), exports.expectedNamespace().toLowerCase())
}

