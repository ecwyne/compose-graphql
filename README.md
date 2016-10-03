# compose-graphql

## Install
For now, this is not a published package on npm. To test it install with the following command.
```bash
npm install --save ecwyne/compose-graphql
```
This will pull the latest code from GitHub and install the package in your `node_modules` folder.

## Use
```javascript
import composeGraphQL from 'compose-graphql';
import gql from 'graphql-tag';

const App = {...} //react component

// graphql query
const myQuery = gql`
query myQuery{
  myResolver{
    myValue
  }
}
`
export default composeGraphQL(myQuery, App);
```
