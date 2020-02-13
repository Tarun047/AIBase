'use strict';

var assert = require('assert');
var Path = require('path');
var fs = require('fs');
var os = require('os');

var _ = require('lodash');
var glob = require('glob')
var URI = require('urijs');
var sh = require('shelljs');
var YAML = require('js-yaml');
var editor = require('editor');
var Promise = require('bluebird');
var mkdirp = require('mkdirp').sync;
var sanitize = require('sanitize-filename');
var sortobject = require('deep-sort-object');
var mktemp = require('mktemp').createFileSync;

exports.readYaml = function (filename) {
  if (!fs.existsSync(filename))
    return;

  var data = fs.readFileSync(filename, 'utf-8');
  return YAML.safeLoad(data, {filename: filename});
}

exports.readJson = function (filename) {
  if (!fs.existsSync(filename))
    return;

  var data = fs.readFileSync(filename, 'utf-8');
  return JSON.parse(data);
}

exports.saveJson = function (path, json, quiet) {
  json = exports.sortJson(json);
  exports.saveFile(path, JSON.stringify(json, null, 2) + '\n', quiet);
}

exports.saveYaml = function (path, json, quiet) {
  exports.saveFile(path, exports.Yaml2String(json), quiet);
}

exports.saveFile = function (path, data, quiet) {
  if (!quiet) console.log(path);
  mkdirp(Path.dirname(path));
  fs.writeFileSync(path, data);
}

exports.Yaml2String = function (data) {
  //FIXME: remove
  data = JSON.parse(JSON.stringify(data));

  data = exports.sortJson(data);
  return YAML.safeDump(data, {indent: 2, lineWidth: -1});
}

exports.sortJson = function (json) {
  var json = sortobject(json, function (a, b) {
    if (a === b)
      return 0;
    return (a < b) ? -1 : 1;
  });

  //detect Swagger format.
  if ((_.get(json, 'swagger') !== '2.0') && (!_.get(json,'openapi')))
    return json;

  var fieldOrder = [
    'swagger',
    'schemes',
    'host',
    'basePath',
    'openapi',
    'servers',
    'x-hasEquivalentPaths',
    'info',
    'externalDocs',
    'consumes',
    'produces',
    'securityDefinitions',
    'security',
    'parameters',
    'responses',
    'tags',
    'paths',
    'definitions',
    'components'
  ];

  var sorted = {};
  _.each(fieldOrder, function (name) {
    if (_.isUndefined(json[name]))
      return;

    sorted[name] = json[name];
    delete json[name];
  });
  _.assign(sorted, json);

  return sorted;
}

exports.getSpecs = function (dir) {
  let result = exports.getYamlFiles('**/swagger.yaml', dir);
  result = Object.assign(result,exports.getYamlFiles('**/openapi.yaml', dir));
  return result;
}

exports.getYamlFiles = function (pattern, dir) {
  dir = dir || '';
  var files = glob.sync(dir + pattern);
  return _.transform(files, function (result, filename) {
    result[filename] = exports.readYaml(filename);
  }, {});
}

exports.getProviderName = function (swagger) {
  assert(swagger.info['x-providerName']);
  return swagger.info['x-providerName'];
}

exports.getServiceName = function (swagger) {
  return swagger.info['x-serviceName'];
}

exports.getApiId = function (swagger) {
  var id = exports.getProviderName(swagger);
  assert(id.indexOf(':') === -1);

  var service = exports.getServiceName(swagger);
  if (!_.isUndefined(service)) {
    assert(service.indexOf(':') === -1);
    id += ':' + service;
  }
  return id;
}

exports.getPathComponents = function (swagger, stripVersion) {
  var serviceName = exports.getServiceName(swagger);
  var path = [exports.getProviderName(swagger)];
  if (serviceName)
    path.push(serviceName);
  if (!stripVersion) {
    var version = swagger.info.version||'1.0.0';
    version = version.split(' (')[0];
    path.push(version);
  }

  path = _.map(path, function (str) {
    str = sanitize(str);
    assert(!_.isEmpty(str));
    return str;
  });

  return path;
}

exports.getSwaggerPath = function (swagger, filename) {
  filename = filename || 'swagger.yaml';
  return exports.getPathComponents(swagger).join('/') + '/' + filename;
}

exports.getOrigin = function (swagger) {
  return swagger.info['x-origin'];
}

exports.getOriginUrl = function (swagger) {
  return _.last(exports.getOrigin(swagger)).url;
}

exports.saveSwagger = function (swagger) {
  let filename = 'swagger.yaml';
  if (swagger.openapi) filename = 'openapi.yaml';
  var path = exports.getSwaggerPath(swagger,filename);
  exports.saveYaml(path, swagger);
  return path;
}

exports.exec = function (cmd, canFail) {
  var glovalVerbose = sh.config.verbose;
  sh.config.verbose = false;
  console.log(cmd);
  var result = sh.exec(cmd, {
    async: false,
    silent: true
  });
  sh.config.verbose = glovalVerbose;
  if (!canFail) assert(result.code === 0);
  return result.stdout;
}

exports.urlToFilename = function (url, stripQuery) {
  url = URI(url)

  if (stripQuery)
    url = url.query('');
  return sanitize(url.readable(), {replacement: '_'}).replace(/_+/, '_');
}

exports.editFile = function (str) {
  var pattern = Path.join(os.tmpdir(),'XXXXXX.yaml');
  var tmpfile = mktemp(pattern);
  fs.writeFileSync(tmpfile, str);

  return Promise.fromCallback(function (promiseCb) {
    editor(tmpfile, function (code) {
      if (code !== 0)
        return promiseCb(Error('Editor closed with code ' + code));

      promiseCb(null, fs.readFileSync(tmpfile, 'utf-8'));
    });
  });
}

exports.listZipFiles = function(url, pattern) {
  let lines = exports.exec(`wget -q -O /tmp/t.zip ${url} && unzip -l /tmp/t.zip`).split('\n');
  let files = [];
  for (let line of lines) {
    let filename = line.split('  ').pop().trim();
    if (filename.match(pattern))
      files.push(filename);
  }
  return files;
};

exports.listGitHubFiles = function (user, repo, branch, glob) {
  //TODO: use makeRequest lib to dowload archive
  var files = exports.exec(`wget -q -O- https://codeload.github.com/${user}/${repo}/tar.gz/${branch} | tar -tz --wildcards '*/${glob}'`);
  return _(files)
    .split('\n')
    .map(file => file.replace(repo + '-' + branch + '/', ''))
    .filter(line => line != '' && line.slice(-1) != '/')
    .value();
};

exports.rawGitHubUrl = function (user, repo, branch, path) {
  return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`;
}
