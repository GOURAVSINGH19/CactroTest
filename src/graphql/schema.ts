export const typeDefs = /* GraphQL */ `
  enum Status {
    planned
    ongoing
    done
  }

  type Step {
    id: Int!
    label: String!
    completed: Boolean!
  }

  type Release {
    id: ID!
    name: String!
    dueDate: String!
    additionalInfo: String
    status: Status!
    steps: [Step!]!
  }

  type ReleasePage {
    items: [Release!]!
    total: Int!
    hasMore: Boolean!
  }

  type Query {
    releases(limit: Int = 20, offset: Int = 0): ReleasePage!
    release(id: ID!): Release
  }

  type Mutation {
    createRelease(name: String!, dueDate: String!, additionalInfo: String): Release!
    updateRelease(
      id: ID!
      name: String
      dueDate: String
      additionalInfo: String
    ): Release!
    toggleStep(releaseId: ID!, stepId: Int!, completed: Boolean!): Release!
    updateAdditionalInfo(releaseId: ID!, additionalInfo: String): Release!
    deleteRelease(id: ID!): Boolean!
  }
`;
