/**
 * @license
 * Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt The complete set of authors may be found
 * at http://polymer.github.io/AUTHORS.txt The complete set of contributors may
 * be found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by
 * Google as part of the polymer project is also subject to an additional IP
 * rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {assert} from 'chai';
import * as path from 'path';

import * as defaults from '../defaults';
import {BenchmarkSpec} from '../types';
import {hashStrings, makeServerPlans, ServerPlan} from '../versions';
import {testData} from './test_helpers';

const defaultBrowser = {
  name: defaults.browserName,
  headless: false,
  windowSize: {
    width: defaults.windowWidth,
    height: defaults.windowHeight,
  },
};

suite('versions', () => {
  suite('makeServerPlans', async () => {
    test('various', async () => {
      const specs: BenchmarkSpec[] = [
        // mybench running with two custom versions.
        {
          name: 'mybench',
          url: {
            kind: 'local',
            urlPath: '/mylib/mybench/',
            version: {
              label: 'v1',
              dependencyOverrides: {
                mylib: '1.0.0',
              },
            },
            queryString: '',
          },
          measurement: 'fcp',
          browser: defaultBrowser,
        },
        {
          name: 'mybench',
          url: {
            kind: 'local',
            urlPath: '/mylib/mybench/',
            version: {
              label: 'v2',
              dependencyOverrides: {
                mylib: '2.0.0',
              },
            },
            queryString: '',
          },
          measurement: 'fcp',
          browser: defaultBrowser,
        },

        // mybench and other bench only need the default server.
        {
          name: 'mybench',
          url: {
            kind: 'local',
            urlPath: '/mylib/mybench/',
            queryString: '',
          },
          measurement: 'fcp',
          browser: defaultBrowser,
        },
        {
          name: 'otherbench',
          url: {
            kind: 'local',
            urlPath: '/otherlib/otherbench/',
            queryString: '',
          },
          measurement: 'fcp',
          browser: defaultBrowser,
        },

        // A remote URL doesn't need a server.
        {
          name: 'http://example.com',
          url: {
            kind: 'remote',
            url: 'http://example.com',
          },
          measurement: 'fcp',
          browser: defaultBrowser,
        },
      ];

      const tempDir = '/tmp';
      const actual = await makeServerPlans(testData, tempDir, specs);

      const v1Hash = hashStrings(path.join(testData, 'mylib'), 'v1');
      const v2Hash = hashStrings(path.join(testData, 'mylib'), 'v2');

      const expected: ServerPlan[] = [
        {
          specs: [specs[2], specs[3]],
          npmInstalls: [],
          mountPoints: [
            {
              diskPath: testData,
              urlPath: '/',
            },
          ],
        },

        {
          specs: [specs[0]],
          npmInstalls: [{
            installDir: path.join(tempDir, v1Hash),
            packageJson: {
              private: true,
              dependencies: {
                mylib: '1.0.0',
                otherlib: '0.0.0',
              },
            },
          }],
          mountPoints: [
            {
              diskPath: path.join(tempDir, v1Hash, 'node_modules'),
              urlPath: '/mylib/node_modules',
            },
            {
              diskPath: testData,
              urlPath: '/',
            },
          ],
        },

        {
          specs: [specs[1]],
          npmInstalls: [{
            installDir: path.join(tempDir, v2Hash),
            packageJson: {
              private: true,
              dependencies: {
                mylib: '2.0.0',
                otherlib: '0.0.0',
              },
            },
          }],
          mountPoints: [
            {
              diskPath: path.join(tempDir, v2Hash, 'node_modules'),
              urlPath: '/mylib/node_modules',
            },
            {
              diskPath: testData,
              urlPath: '/',
            },
          ],
        },
      ];

      assert.deepEqual(actual, expected);
    });

    /**
     * Regression test for https://github.com/Polymer/tachometer/issues/82
     * where the node_modules/ directory was being mounted at the
     * "//node_modules" URL.
     */
    test('node_modules as direct child of root dir', async () => {
      const specs: BenchmarkSpec[] = [
        {
          name: 'mybench',
          url: {
            kind: 'local',
            urlPath: '/mybench/',
            version: {
              label: 'v1',
              dependencyOverrides: {
                mylib: '1.0.0',
              },
            },
            queryString: '',
          },
          measurement: 'fcp',
          browser: defaultBrowser,
        },
      ];

      const tempDir = '/tmp';
      const actual =
          await makeServerPlans(path.join(testData, 'mylib'), tempDir, specs);

      const v1Hash = hashStrings(path.join(testData, 'mylib'), 'v1');
      const expected: ServerPlan[] = [
        {
          specs: [specs[0]],
          npmInstalls: [{
            installDir: path.join(tempDir, v1Hash),
            packageJson: {
              private: true,
              dependencies: {
                mylib: '1.0.0',
                otherlib: '0.0.0',
              },
            },
          }],
          mountPoints: [
            {
              diskPath: path.join(tempDir, v1Hash, 'node_modules'),
              urlPath: '/node_modules',
            },
            {
              diskPath: path.join(testData, 'mylib'),
              urlPath: '/',
            },
          ],
        },
      ];

      assert.deepEqual(actual, expected);
    });
  });
});
