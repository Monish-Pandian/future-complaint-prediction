import React from 'react';
import EvaluationDetailDrawer from './EvaluationDetailDrawer';

/**
 * Re-export EvaluationDetailDrawer as EvaluationDetailsModal for backwards compatibility
 */
export default function EvaluationDetailsModal(props) {
  return <EvaluationDetailDrawer {...props} />;
}
