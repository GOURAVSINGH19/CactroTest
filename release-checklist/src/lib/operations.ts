import { gql } from "@apollo/client";

export const RELEASE_FIELDS = gql`
  fragment ReleaseFields on Release {
    id
    name
    dueDate
    additionalInfo
    status
    steps {
      id
      label
      completed
    }
  }
`;

export const RELEASES = gql`
  query Releases {
    releases {
      ...ReleaseFields
    }
  }
  ${RELEASE_FIELDS}
`;

export const CREATE_RELEASE = gql`
  mutation CreateRelease($name: String!, $dueDate: String!, $additionalInfo: String) {
    createRelease(name: $name, dueDate: $dueDate, additionalInfo: $additionalInfo) {
      ...ReleaseFields
    }
  }
  ${RELEASE_FIELDS}
`;

export const TOGGLE_STEP = gql`
  mutation ToggleStep($releaseId: ID!, $stepId: Int!, $completed: Boolean!) {
    toggleStep(releaseId: $releaseId, stepId: $stepId, completed: $completed) {
      ...ReleaseFields
    }
  }
  ${RELEASE_FIELDS}
`;

export const UPDATE_INFO = gql`
  mutation UpdateInfo($releaseId: ID!, $additionalInfo: String) {
    updateAdditionalInfo(releaseId: $releaseId, additionalInfo: $additionalInfo) {
      ...ReleaseFields
    }
  }
  ${RELEASE_FIELDS}
`;

export const DELETE_RELEASE = gql`
  mutation DeleteRelease($id: ID!) {
    deleteRelease(id: $id)
  }
`;
