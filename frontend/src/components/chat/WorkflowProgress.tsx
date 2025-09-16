import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  Chip,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Alert,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Error,
  Schedule,
  Cancel,
  Refresh,
  Visibility,
  Stop
} from '@mui/icons-material';

interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  error?: string;
  progress?: number;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: number;
  currentStep?: string;
  steps: WorkflowStep[];
  startTime: Date;
  endTime?: Date;
  error?: string;
  canCancel: boolean;
  canRetry: boolean;
}

interface WorkflowProgressProps {
  executionId: string;
  tenantId: string;
  onCancel?: (executionId: string) => void;
  onRetry?: (executionId: string) => void;
  onViewDetails?: (executionId: string) => void;
  compact?: boolean;
}

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  executionId,
  tenantId,
  onCancel,
  onRetry,
  onViewDetails,
  compact = false
}) => {
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExecution();
    
    // Set up polling for running executions
    const interval = setInterval(() => {
      if (execution?.status === 'running' || execution?.status === 'paused') {
        loadExecution();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [executionId, execution?.status]);

  const loadExecution = async () => {
    try {
      const response = await fetch(`/api/integrations/executions/${executionId}?tenantId=${tenantId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load execution details');
      }

      const data = await response.json();
      setExecution(data);
      setError(null);
    } catch (err) {
      console.error('Error loading execution:', err);
      setError('Failed to load execution details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!execution || !onCancel) return;

    try {
      await fetch(`/api/integrations/executions/${executionId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      });
      
      onCancel(executionId);
      loadExecution();
    } catch (err) {
      console.error('Error cancelling execution:', err);
    }
  };

  const handleRetry = async () => {
    if (!execution || !onRetry) return;

    try {
      await fetch(`/api/integrations/executions/${executionId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      });
      
      onRetry(executionId);
      loadExecution();
    } catch (err) {
      console.error('Error retrying execution:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'default';
      case 'paused':
        return 'warning';
      case 'running':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'failed':
        return <Error color="error" />;
      case 'cancelled':
        return <Cancel color="disabled" />;
      case 'paused':
        return <Schedule color="warning" />;
      case 'running':
        return <CircularProgress size={20} />;
      default:
        return <Schedule color="disabled" />;
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" fontSize="small" />;
      case 'failed':
        return <Error color="error" fontSize="small" />;
      case 'running':
        return <CircularProgress size={16} />;
      case 'skipped':
        return <Cancel color="disabled" fontSize="small" />;
      default:
        return <Schedule color="disabled" fontSize="small" />;
    }
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  if (loading) {
    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <CircularProgress size={20} />
            <Typography variant="body2">Loading execution details...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error || !execution) {
    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Alert severity="error">
            {error || 'Execution not found'}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ pb: compact ? 2 : 1 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            {getStatusIcon(execution.status)}
            <Box>
              <Typography variant="subtitle2" fontWeight="medium">
                {execution.workflowName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDuration(execution.startTime, execution.endTime)}
                {execution.currentStep && ` • ${execution.currentStep}`}
              </Typography>
            </Box>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={execution.status}
              size="small"
              color={getStatusColor(execution.status) as any}
              variant="outlined"
            />
            
            {!compact && (
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Progress
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {Math.round(execution.progress)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={execution.progress}
            color={getStatusColor(execution.status) as any}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        {/* Error Message */}
        {execution.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {execution.error}
          </Alert>
        )}

        {/* Action Buttons */}
        <Box display="flex" gap={1} mb={expanded ? 2 : 0}>
          {execution.canCancel && execution.status === 'running' && (
            <Button
              size="small"
              startIcon={<Stop />}
              onClick={handleCancel}
              color="error"
              variant="outlined"
            >
              Cancel
            </Button>
          )}
          
          {execution.canRetry && (execution.status === 'failed' || execution.status === 'cancelled') && (
            <Button
              size="small"
              startIcon={<Refresh />}
              onClick={handleRetry}
              color="primary"
              variant="outlined"
            >
              Retry
            </Button>
          )}
          
          {onViewDetails && (
            <Button
              size="small"
              startIcon={<Visibility />}
              onClick={() => onViewDetails(executionId)}
              variant="outlined"
            >
              Details
            </Button>
          )}
        </Box>

        {/* Detailed Steps */}
        <Collapse in={expanded}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Execution Steps
            </Typography>
            <List dense>
              {execution.steps.map((step, index) => (
                <ListItem key={step.id} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {getStepIcon(step.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2">
                          {index + 1}. {step.name}
                        </Typography>
                        {step.progress !== undefined && step.status === 'running' && (
                          <Typography variant="caption" color="text.secondary">
                            ({step.progress}%)
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        {step.startTime && (
                          <Typography variant="caption" color="text.secondary">
                            {formatDuration(step.startTime, step.endTime)}
                          </Typography>
                        )}
                        {step.error && (
                          <Typography variant="caption" color="error.main" display="block">
                            Error: {step.error}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  
                  {step.status === 'running' && step.progress !== undefined && (
                    <Box width={60}>
                      <LinearProgress
                        variant="determinate"
                        value={step.progress}
                        size="small"
                        sx={{ height: 4, borderRadius: 2 }}
                      />
                    </Box>
                  )}
                </ListItem>
              ))}
            </List>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};
