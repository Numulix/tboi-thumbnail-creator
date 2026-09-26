import { useMemo, useReducer } from 'react';
import {
  createSceneActions,
  sceneReducer,
  type SceneAction,
  type SceneActions,
} from './sceneMutations';
import { createDefaultSceneState, type SceneState } from './sceneTypes';

// Re-export all domain types & constants
export * from './sceneTypes';

// Re-export layout & coordinate resolution
export * from './sceneLayout';

// Re-export all mutations, action definitions, reducer & dispatcher
export * from './sceneMutations';

/**
 * High-leverage hook for coordinating declarative SceneState mutations.
 */
export function useSceneDocument(
  initialState?: SceneState | (() => SceneState)
): {
  scene: SceneState;
  dispatch: React.Dispatch<SceneAction>;
  actions: SceneActions;
} {
  const [scene, dispatch] = useReducer(
    sceneReducer,
    undefined,
    () => {
      if (typeof initialState === 'function') {
        return initialState();
      }
      return initialState ?? createDefaultSceneState();
    }
  );

  const actions = useMemo(() => createSceneActions(dispatch), [dispatch]);

  return { scene, dispatch, actions };
}
