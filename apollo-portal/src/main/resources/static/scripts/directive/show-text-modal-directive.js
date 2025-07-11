/*
 * Copyright 2024 Apollo Authors
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
 *
 */
directive_module.directive('showtextmodal', showTextModalDirective)
    .filter('jsonBigIntFilter', function () {
        return function (text) {
            if (typeof(text) === "undefined" || typeof JSON.parse(text) !== "object"
                || !text) {
                return;
            }

            const numberRegex = /"\|+\d+\|+"/g;
            const splitRegex = /"\|+\d+\|+"/;
            const splitArray = text.split(splitRegex);
            const matchResult = text.match(numberRegex);
            const borderRegex = /"\|\d+\|"/;
            if (!matchResult || 0 === splitArray.length) {
                return text;
            } else {
                Object.keys(matchResult).forEach(function (key) {
                    if (matchResult[key].includes('"\|')) {
                        if (borderRegex.test(matchResult[key])) {
                            matchResult[key] = matchResult[key].replaceAll('"\|', '');
                            matchResult[key] = matchResult[key].replaceAll('|\"', '');
                        } else {
                            matchResult[key] = matchResult[key].replaceAll('"\|', '"');
                            matchResult[key] = matchResult[key].replaceAll('|\"', '"');
                        }
                    }
                });
            }

            let resultStr = '';
            let index = 0;

            const isJsonText = resultStr => {
                try {
                    return typeof JSON.parse(resultStr) === "object";
                } catch (e) {
                    return false;
                }
            };

            Object.keys(splitArray).forEach(function (key) {
                resultStr = resultStr.concat(splitArray[key]);
                if (typeof(matchResult[index]) !== "undefined"
                    && !isJsonText(resultStr)) {
                    resultStr = resultStr.concat(matchResult[index++])
                }
            })

            return resultStr;
        }
    });


function showTextModalDirective(AppUtil) {
    return {
        restrict: 'E',
        templateUrl: AppUtil.prefixPath() + '/views/component/show-text-modal.html',
        transclude: true,
        replace: true,
        scope: {
            text: '=',
            oldStr: '=',
            newStr: '=',
            enableTextDiff: '='
        },
        link: function (scope) {
            scope.$watch('text', init);

            function init() {
                scope.jsonObject = undefined;
                if (isJsonText(scope.text)) {
                    // Check for duplicate keys and do not JSON format if they exist
                    if (!hasDuplicateKeys(scope.text)) {
                        scope.jsonObject = parseBigInt(scope.text);
                    }
                }
            }

            function isJsonText(text) {
                try {
                    return typeof JSON.parse(text) === "object";
                } catch (e) {
                    return false;
                }
            }

            function hasDuplicateKeys(jsonStr) {
                try {
                    var parsedObj = JSON.parse(jsonStr);
                    
                    return checkDuplicateKeysInJsonString(jsonStr);
                } catch (e) {
                    return false;
                }
            }

            function checkDuplicateKeysInJsonString(jsonStr) {
                // This method is safer since we already know the JSON is valid
                
                // Remove all whitespace characters for processing
                var trimmed = jsonStr.replace(/\s/g, '');
                
                // Check if it's in object format
                if (trimmed.charAt(0) !== '{' || trimmed.charAt(trimmed.length - 1) !== '}') {
                    return false;
                }
                
                // Extract top-level key-value pairs
                var content = trimmed.slice(1, -1); // Remove leading and trailing {}
                var keys = [];
                var inString = false;
                var escaped = false;
                var braceLevel = 0;
                var bracketLevel = 0;
                var currentKey = '';
                var collectingKey = false;
                
                for (var i = 0; i < content.length; i++) {
                    var char = content[i];
                    
                    if (escaped) {
                        escaped = false;
                        if (collectingKey) {
                            currentKey += char;
                        }
                        continue;
                    }
                    
                    if (char === '\\') {
                        escaped = true;
                        if (collectingKey) {
                            currentKey += char;
                        }
                        continue;
                    }
                    
                    if (char === '"') {
                        if (!inString && braceLevel === 0 && bracketLevel === 0) {
                            // Start collecting key
                            collectingKey = true;
                            currentKey = '';
                        } else if (inString && collectingKey) {
                            // Finish collecting key
                            keys.push(currentKey);
                            collectingKey = false;
                            currentKey = '';
                        }
                        inString = !inString;
                        continue;
                    }
                    
                    if (inString) {
                        if (collectingKey) {
                            currentKey += char;
                        }
                        continue;
                    }
                    
                    // Track nesting levels
                    if (char === '{') {
                        braceLevel++;
                    } else if (char === '}') {
                        braceLevel--;
                    } else if (char === '[') {
                        bracketLevel++;
                    } else if (char === ']') {
                        bracketLevel--;
                    }
                }
                
                // Check for duplicate keys
                var uniqueKeys = {};
                for (var j = 0; j < keys.length; j++) {
                    if (uniqueKeys[keys[j]]) {
                        return true; // Found duplicate key
                    }
                    uniqueKeys[keys[j]] = true;
                }
                
                return false;
            }

            function parseBigInt(str) {
                if (/\d+/.test(str)) {
                    let replaceMap = [];
                    let n = 0;
                    str = str.replace(/"\|+\d+\|+"/g, function (match) {
                        return match.replace('"\|', '"\||').replace('|"', '||"');
                    })
                    .replace(/"(\\?[\s\S])*?"/g, function (match) {
                        if (/\d+/.test(match)) {
                            replaceMap.push(match);
                            return '"""';
                        }
                        return match;
                    }).replace(/[+\-\d.eE]+/g, function (match) {
                        if (/^\d+$/.test(match)) {
                            return '"|' + match + '|"';
                        }
                        return match;
                    }).replace(/"""/g, function () {
                        return replaceMap[n++];
                    })
                }
                return JSON.parse(str);
            }
        }
    }
}


