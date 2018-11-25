'use strict';
const { writeFileSync, unlinkSync } = require('fs');
const { execSync, spawnSync } = require('child_process');
const assert = require('chai').assert;
const { compileFile } = require('..');
const path = require('path');

exports.compile = function(file) {
    const output = pathInFixtures(`${path.basename(file, '.js')}.c`);
    try {
        // ensure later steps don't run a stale exe
        unlinkSync(output);
    } catch(e) {
        if(e.code !== 'ENOENT') {
            throw e;
        }
    }

    const cSrc = compileFile(file);
    writeFileSync(output, cSrc);
    return output;
}

exports.link = function(cFile) {
    const binPath = pathInFixtures(path.basename(cFile, '.c'));
    execSync(`${__dirname}/../link-c ${cFile} ${binPath}`);
    return binPath;
}

exports.runExecutable = function(path, opts) {
    try {
        return spawnSync(path, opts);
    } catch(e) {
        console.log(e);
        
        return e;
    }
}

exports.assertOutput = function({
    stderr,
    stdout,
    status,
    error,
    signal,
}, {
    // ''/Match pairs are mutually exclusive
    output,
    outputMatch,
    errorOut,
    errorOutMatch,
    expectedStatus = 0,
}) {
    const errors = compositeErrors(
        () => assert.isUndefined(error),
        () => assert.isUndefined(signal),
        () => {
            if(expectedStatus != null) {
                assert.equal(status, expectedStatus);
            }
        },
        () => {
            if(output != null) {
                assert.equal(stdout.toString().trim(), output);
            }
        },
        () => {
            if(outputMatch != null) {
                assert.match(stdout.toString(), new RegExp(outputMatch, 'm'));
            }
        },
        () => {
            if(errorOut != null) {
                assert.equal(stderr.toString().trim(), errorOut);
            }
        },
        () => {
            if(errorOutMatch != null) {
                assert.match(stderr.toString(), new RegExp(errorOutMatch, 'm'));
            }
        },
    )

    assert.deepEqual(errors, []);
}

function compositeErrors(...tests) {
    return tests.reduce((es, t) => {
        try {
            t()
        } catch(e) {
            es.push(e)
        }
        return es
    }, [])
  
}

function pathInFixtures(fn) {
    return `${__dirname}/fixtures/${fn}`;
}
