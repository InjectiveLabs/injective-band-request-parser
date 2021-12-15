const { gql } = require("@apollo/client/core");
const {
  ApolloClient,
  HttpLink,
  InMemoryCache,
} = require("@apollo/client/core");
const crossFetch = require("cross-fetch");

const ORACLE_SCRIPT_ID = 23;
const REQUEST_TIME_UNIX = 1639429200;
const BAND_GRAPH_URL = "https://graphql-lm.bandchain.org/v1/graphql";

const ORACLE_REQUESTS = gql`
  query OracleRequests {
    oracle_script_requests(where: { oracle_script_id: { _eq: ${ORACLE_SCRIPT_ID} } }) {
      oracle_script_id
      oracle_script {
        id
        name
        description
        codehash
        owner
        schema
        source_code_url
        transaction_id
        requests(where: { request_time: { _gte: ${REQUEST_TIME_UNIX} } }) {
          result
          sender
          total_fees
          resolve_status
          resolve_time
          resolve_height
          request_time
          reason
          is_ibc
          calldata
        }
      }
    }
  }
`;

const ORACLE_REQUESTS_BY_PK = gql`
  query OracleRequests {
    oracle_script_requests_by_pk(oracle_script_id: ${ORACLE_SCRIPT_ID}) {
      oracle_script {
        id
        codehash
        description
        name
        owner
        schema
        source_code_url
        transaction_id
        requests(where: { request_time: { _gte: ${REQUEST_TIME_UNIX} } }) {
          result
          id
          fee_limit
          client_id
          calldata
          request_time
          resolve_height
          resolve_status
          resolve_time
          sender
          transaction_id
        }
      }
    }
  }
`;

class ApolloConsumer {
  apolloClient;

  constructor(graphQlEndpoint: string) {
    this.apolloClient = new ApolloClient({
      link: new HttpLink({ uri: graphQlEndpoint, fetch: crossFetch }),
      cache: new InMemoryCache(),
      defaultOptions: {
        query: {
          fetchPolicy: "no-cache",
          errorPolicy: "all",
        },
      },
    });
  }

  async fetchOracleRequests() {
    const response = await this.apolloClient.query({
      query: ORACLE_REQUESTS,
    });

    if (response.errors && response.errors.length > 0) {
      throw new Error(response.errors[0].message);
    }

    return response.data.oracle_script_requests
      ? response.data.oracle_script_requests[0].oracle_script
      : {};
  }

  async fetchOracleRequestsByPk() {
    const response = await this.apolloClient.query({
      query: ORACLE_REQUESTS_BY_PK,
    });

    if (response.errors && response.errors.length > 0) {
      throw new Error(response.errors[0].message);
    }

    return response.data.oracle_script_requests_by_pk
      ? response.data.oracle_script_requests_by_pk.oracle_script
      : {};
  }
}

const apolloConsumer = new ApolloConsumer(BAND_GRAPH_URL);

export { apolloConsumer };
