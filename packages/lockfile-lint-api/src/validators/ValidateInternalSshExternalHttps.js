'use strict'

const {URL} = require('url')
const debug = require('debug')('lockfile-lint-api')

const GITHUB_HOST = 'github.com'

const GITSSH_PROTOCOL = 'git+ssh:'
const HTTPS_PROTOCOL = 'https:'
const FILE_PROTOCOL = 'file:'

module.exports = class ValidateInternalSshExternalHttps {
  constructor ({packages} = {}) {
    if (typeof packages !== 'object') {
      throw new Error('expecting an object passed to validator constructor')
    }

    this.packages = packages
  }

  validate (orgName, options) {
    let validationResult = {
      type: 'success',
      errors: []
    }

    const internalHost = options['internal-repo-host'] || GITHUB_HOST

    for (const [packageName, packageMetadata] of Object.entries(this.packages)) {
      if (!('resolved' in packageMetadata)) {
        continue
      }

      let packageResolvedURL = {}

      try {
        packageResolvedURL = new URL(packageMetadata.resolved)

        // if internal host and internal organization
        if (
          packageResolvedURL.host === internalHost &&
          packageResolvedURL.pathname.split('/')[1] === orgName
        ) {
          // protocol must be git+ssh
          if (packageResolvedURL.protocol !== GITSSH_PROTOCOL) {
            validationResult.errors.push({
              message: `Internal packages must use the 'git+ssh' protocol, but package: ${packageName} used '${
                packageResolvedURL.protocol
              }\n`,
              package: packageName
            })
          }
          continue
        }
        // in all other cases, protocol must be https or file
        if (
          packageResolvedURL.protocol !== HTTPS_PROTOCOL &&
          packageResolvedURL.protocol !== FILE_PROTOCOL
        ) {
          validationResult.errors.push({
            message: `Non-internal packages must use the 'https' protocol, but package: ${packageName} used ${
              packageResolvedURL.protocol
            }\n`,
            package: packageName
          })
        }
      } catch (error) {
        debug('ERROR: ' + error)
        // swallow error (assume that the version is correct)
      }
    }

    if (validationResult.errors.length !== 0) {
      validationResult.type = 'error'
    }

    return validationResult
  }
}
