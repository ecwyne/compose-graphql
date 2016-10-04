import { graphql } from 'react-apollo';
import R from 'ramda';

// a simplistic type checker
const isDocument = (obj = {}) => obj.kind == 'Document';

// Initially tried obj instanceof React.Component but functional
// components are not instances of new React.Component
const isComponent = R.is(Function);

// Parse document, options, operationName, and operationType from operation
// doing so also catches errors early and provides for more meaningful stack traces
const normalize = (obj = {}) => {
	if (isComponent(obj)){
		return obj;
	} else {
		const document = isDocument(obj) ? obj : isDocument(obj.document) ? obj.document : null;
		if (!document) {
			throw new Error(`composeGraphQL: A document is required. Instead got ${obj}.`);
		}
		const {name, options = {}} = obj;
		try{
			return {
				document,
				name,
				options,
				operationType: document.definitions[0].operation,
				operationName: name || document.definitions[0].selectionSet.selections[0].name.value
			};
		} catch (e){
			console.log(e);
			throw new Error('composeGraphQL: could not parse document.');
		}
	}
};

// Continue returning function to collect more arguments until a component is received
// Throws if component is not the final argument.
const collectArgs = (...args) => {
	args = R.flatten(args).map(normalize); // documents can be passed in array or as individual arguments
	const componentIndex = R.findIndex(isComponent, args);
	if (componentIndex === -1){
		// no component given, continue to collect args
		return (...newArgs) => collectArgs(...args, ...newArgs);
	} else if (componentIndex !== args.length - 1){
		// component found before end of array
		throw new Error('React Component MUST be final argument to composeGraphQL');
	} else {
		// everything looks good
		return composeGraphQL(args);
	}
};

// arr => arr.map(e => graphql(e, e.options)).reduceRight()
// GraphQL operations are mapped to HOCs using graphql()
// reduceRight is used to compose all of the HOCs together
const composeGraphQL = arr => {
	return arr.map(val => {
		if (isComponent(val)){
			return val;
		}
		const {document, options, operationName, operationType} = val;
		if (operationType == 'query'){
			return graphql(document, {options});
		} else if (operationType == 'mutation'){
			const setProps = ({ ownProps, mutate }) => ({
				[operationName]: args => {
					const evalCallableProps = e => typeof e === 'function' ? e(args, ownProps) : e;
					const optimisticResponse = evalCallableProps(options.optimisticResponse);
					const variables = evalCallableProps(options.variables) || args;
					const updateQueries = R.mapObjIndexed((updateFn, queryName) => {
						return (prev, result) => updateFn(prev, R.path(['mutationResult', 'data', operationName], result));
					}, options.updateQueries);

					const mutationOptions = Object.assign({}, options, {variables, optimisticResponse, updateQueries});
					return mutate(mutationOptions);
				},
			});
			return graphql(document, {props: setProps});
		} else {
			console.log(`running ${operationType} doc`);
			throw new Error(`composeQraphQL is currently not able to compose ${operationType} operations`);
		}

	}).reduceRight((acc, val) => val(acc)); // op3(op2(op1(component)))
};

export default collectArgs;
