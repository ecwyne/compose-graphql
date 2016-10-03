'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _reactApollo = require('react-apollo');

var _ramda = require('ramda');

var _ramda2 = _interopRequireDefault(_ramda);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// a simplistic type checker
var isDocument = function isDocument() {
	var obj = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	return obj.kind == 'Document';
};

// Initially tried obj instanceof React.Component but functional
// components are not instances of new React.Component
var isComponent = _ramda2.default.is(Function);

// Parse document, options, operationName, and operationType from operation
// doing so also catches errors early and provides for more meaningful stack traces
var normalize = function normalize() {
	var obj = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	if (isComponent(obj)) {
		return obj;
	} else {
		var document = isDocument(obj) ? obj : isDocument(obj.document) ? obj.document : null;
		if (!document) {
			throw new Error('composeGraphQL: A document is required. Instead got ' + obj + '.');
		}
		var name = obj.name;
		var _obj$options = obj.options;
		var options = _obj$options === undefined ? {} : _obj$options;

		try {
			return {
				document: document,
				name: name,
				options: options,
				operationType: document.definitions[0].operation,
				operationName: name || document.definitions[0].selectionSet.selections[0].name.value
			};
		} catch (e) {
			console.log(e);
			throw new Error('composeGraphQL: could not parse document.');
		}
	}
};

// Continue returning function to collect more arguments until a component is received
// Throws if component is not the final argument.
var collectArgs = function collectArgs() {
	for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
		args[_key] = arguments[_key];
	}

	args = _ramda2.default.flatten(args).map(normalize);
	var componentIndex = _ramda2.default.findIndex(isComponent, args);
	if (componentIndex === -1) {
		return function () {
			for (var _len2 = arguments.length, newArgs = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
				newArgs[_key2] = arguments[_key2];
			}

			return collectArgs.apply(undefined, _toConsumableArray(args).concat(newArgs));
		};
	} else if (componentIndex !== args.length - 1) {
		throw new Error('React Component MUST be final argument to composeGraphQL');
	} else {
		return composeGraphQL(args);
	}
};

// arr => arr.map(e => graphql(e, e.options)).reduceRight()
// GraphQL operations are mapped to HOCs using graphql()
// reduceRight is used to compoes all of the HOCs together
var composeGraphQL = function composeGraphQL(arr) {
	return arr.map(function (val) {
		if (isComponent(val)) {
			return val;
		}
		var document = val.document;
		var options = val.options;
		var operationName = val.operationName;
		var operationType = val.operationType;

		if (operationType == 'query') {
			return (0, _reactApollo.graphql)(document, { options: options });
		} else if (operationType == 'mutation') {
			var setProps = function setProps(_ref) {
				var ownProps = _ref.ownProps;
				var mutate = _ref.mutate;
				return _defineProperty({}, operationName, function (args) {
					var evalCallableProps = function evalCallableProps(e) {
						return typeof e === 'function' ? e(args, ownProps) : e;
					};
					var optimisticResponse = evalCallableProps(options.optimisticResponse);
					var variables = evalCallableProps(options.variables) || args;
					var updateQueries = _ramda2.default.mapObjIndexed(function (updateFn, queryName) {
						return function (prev, result) {
							return updateFn(prev, _ramda2.default.path(['mutationResult', 'data', operationName], result));
						};
					}, options.updateQueries);

					var mutationOptions = Object.assign({}, options, { variables: variables, optimisticResponse: optimisticResponse, updateQueries: updateQueries });
					return mutate(mutationOptions);
				});
			};
			return (0, _reactApollo.graphql)(document, { props: setProps });
		} else {
			console.log('running ' + operationType + ' doc');
			throw new Error('composeQraphQL is currently not able to compose ' + operationType + ' operations');
		}
	}).reduceRight(function (acc, val) {
		return val(acc);
	});
};

exports.default = collectArgs;