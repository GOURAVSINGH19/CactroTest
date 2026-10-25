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

  type Query {
    releases: [Release!]!
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
