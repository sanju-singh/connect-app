import _ from 'lodash'
import { loadProject, loadProjectInvite, loadDirectProjectData, loadProjectMembers, loadProjectMemberInvites } from './project'
import { loadProjectPlan } from './projectPlan'
import { loadProjectsMetadata } from '../../actions/templates'
import { LOAD_PROJECT_DASHBOARD, LOAD_ADDITIONAL_PROJECT_DATA } from '../../config/constants'

/**
 * Load all project data to paint the dashboard
 *
 * @param {Function} dispatch  dispatches redux actions
 * @param {Function} getState  returns redux state
 * @param {Number}   projectId project id
 *
 * @return {Promise} LOAD_ADDITIONAL_PROJECT_DATA action
 */
const getDashboardData = (dispatch, getState, projectId, isOnlyLoadProjectInfo) => {
  const { productTemplates } = getState().templates
  return dispatch(loadProject(projectId))
    .then(({ value: project }) => {
      let userIds = _.map(project.members, 'userId')
      userIds = _.union(userIds, _.map(project.invites, 'userId'))

      // this is to remove any nulls from the list (dev had some bad data)
      _.remove(userIds, i => !i)
      // load additional data in parallel
      let promises = [
        //dispatch(loadMembers(userIds)),
        dispatch(loadProjectMembers(projectId)),
        dispatch(loadProjectMemberInvites(projectId))
      ]
      if (isOnlyLoadProjectInfo) {
        promises = []
      }

      if (project.directProjectId && !isOnlyLoadProjectInfo) {
        promises.push(dispatch(loadDirectProjectData(project.directProjectId)))
      }

      // for new projects load phases, products, project template and product templates
      if (project.version === 'v3') {
        promises.push(
          dispatch(loadProjectPlan(projectId, userIds))
        )
      }

      if (!productTemplates) {
        promises.push(dispatch(loadProjectsMetadata()))
      }

      return dispatch({
        type: LOAD_ADDITIONAL_PROJECT_DATA,
        payload: Promise.all(promises)
      })

    })
}

/**
 * Load project data and project invite
 *
 * @param {Function} dispatch  dispatches redux actions
 * @param {Function} getState  returns redux state
 * @param {Number}   projectId project id
 *
 * @return {Promise} LOAD_ADDITIONAL_PROJECT_DATA action
 */
const getData = (dispatch, getState, projectId, isOnlyLoadProjectInfo) => {
  return dispatch(loadProjectInvite(projectId))
    .then(() => getDashboardData(dispatch, getState, projectId, isOnlyLoadProjectInfo))
    .catch(() => getDashboardData(dispatch, getState, projectId, isOnlyLoadProjectInfo))
}

export function loadProjectDashboard(projectId, isOnlyLoadProjectInfo = false) {
  return (dispatch, getState) => {
    return dispatch({
      type: LOAD_PROJECT_DASHBOARD,
      payload: Promise.all([getData(dispatch, getState, projectId, isOnlyLoadProjectInfo)])
    })
  }
}
