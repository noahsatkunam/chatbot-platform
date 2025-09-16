import React, { useState, useEffect } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box
} from '@mui/material';
import {
  PlayArrow,
  ExpandMore,
  AutoAwesome,
  Schedule,
  Link,
  Warning
} from '@mui/icons-material';

interface Workflow {
  id: string;
  name: string;
  description: string;
  type: 'manual' | 'automatic' | 'scheduled';
  isActive: boolean;
  requiresConfirmation: boolean;
  estimatedDuration?: number;
  tags: string[];
}

interface WorkflowTriggerButtonProps {
  conversationId: string;
  userId: string;
  tenantId: string;
  onWorkflowTriggered: (workflowId: string, executionId: string) => void;
  onError: (error: string) => void;
}

export const WorkflowTriggerButton: React.FC<WorkflowTriggerButtonProps> = ({
  conversationId,
  userId,
  tenantId,
  onWorkflowTriggered,
  onError
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    workflow?: Workflow;
  }>({ open: false });
  const [executing, setExecuting] = useState<string | null>(null);

  const open = Boolean(anchorEl);

  useEffect(() => {
    loadAvailableWorkflows();
  }, [conversationId, tenantId]);

  const loadAvailableWorkflows = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/integrations/workflows/available?tenantId=${tenantId}&conversationId=${conversationId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load workflows');
      }

      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error('Error loading workflows:', error);
      onError('Failed to load available workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleWorkflowSelect = (workflow: Workflow) => {
    handleClose();
    
    if (workflow.requiresConfirmation) {
      setConfirmDialog({ open: true, workflow });
    } else {
      executeWorkflow(workflow.id);
    }
  };

  const executeWorkflow = async (workflowId: string) => {
    try {
      setExecuting(workflowId);
      
      const response = await fetch('/api/integrations/workflows/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflowId,
          conversationId,
          userId,
          tenantId,
          context: {
            source: 'manual_trigger',
            timestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to execute workflow');
      }

      const data = await response.json();
      onWorkflowTriggered(workflowId, data.executionId);
      
    } catch (error) {
      console.error('Error executing workflow:', error);
      onError('Failed to execute workflow');
    } finally {
      setExecuting(null);
      setConfirmDialog({ open: false });
    }
  };

  const handleConfirmExecution = () => {
    if (confirmDialog.workflow) {
      executeWorkflow(confirmDialog.workflow.id);
    }
  };

  const handleCancelExecution = () => {
    setConfirmDialog({ open: false });
  };

  const getWorkflowIcon = (type: string) => {
    switch (type) {
      case 'automatic':
        return <AutoAwesome fontSize="small" />;
      case 'scheduled':
        return <Schedule fontSize="small" />;
      default:
        return <PlayArrow fontSize="small" />;
    }
  };

  const getWorkflowColor = (type: string) => {
    switch (type) {
      case 'automatic':
        return 'primary';
      case 'scheduled':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const activeWorkflows = workflows.filter(w => w.isActive);
  const hasWorkflows = activeWorkflows.length > 0;

  return (
    <>
      <Tooltip title={hasWorkflows ? "Execute Workflow" : "No workflows available"}>
        <span>
          <Button
            variant="outlined"
            size="small"
            startIcon={loading ? <CircularProgress size={16} /> : <PlayArrow />}
            endIcon={hasWorkflows ? <ExpandMore /> : undefined}
            onClick={handleClick}
            disabled={!hasWorkflows || loading}
            sx={{
              minWidth: 'auto',
              borderRadius: 2,
              textTransform: 'none'
            }}
          >
            Workflows
          </Button>
        </span>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            maxHeight: 400,
            minWidth: 300,
            mt: 1
          }
        }}
      >
        {activeWorkflows.map((workflow) => (
          <MenuItem
            key={workflow.id}
            onClick={() => handleWorkflowSelect(workflow)}
            disabled={executing === workflow.id}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon>
              {executing === workflow.id ? (
                <CircularProgress size={20} />
              ) : (
                getWorkflowIcon(workflow.type)
              )}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" fontWeight="medium">
                    {workflow.name}
                  </Typography>
                  <Chip
                    label={workflow.type}
                    size="small"
                    color={getWorkflowColor(workflow.type) as any}
                    variant="outlined"
                  />
                </Box>
              }
              secondary={
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {workflow.description}
                  </Typography>
                  {workflow.estimatedDuration && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      Est. duration: {formatDuration(workflow.estimatedDuration)}
                    </Typography>
                  )}
                  {workflow.tags.length > 0 && (
                    <Box display="flex" gap={0.5} mt={0.5}>
                      {workflow.tags.slice(0, 3).map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      ))}
                      {workflow.tags.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{workflow.tags.length - 3} more
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              }
            />
            {workflow.requiresConfirmation && (
              <Tooltip title="Requires confirmation">
                <Warning fontSize="small" color="warning" />
              </Tooltip>
            )}
          </MenuItem>
        ))}
        
        {activeWorkflows.length === 0 && (
          <MenuItem disabled>
            <ListItemText
              primary="No workflows available"
              secondary="Create workflows to see them here"
            />
          </MenuItem>
        )}
      </Menu>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCancelExecution}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Warning color="warning" />
            Confirm Workflow Execution
          </Box>
        </DialogTitle>
        <DialogContent>
          {confirmDialog.workflow && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {confirmDialog.workflow.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {confirmDialog.workflow.description}
              </Typography>
              
              <Box display="flex" gap={1} mb={2}>
                <Chip
                  label={confirmDialog.workflow.type}
                  size="small"
                  color={getWorkflowColor(confirmDialog.workflow.type) as any}
                />
                {confirmDialog.workflow.estimatedDuration && (
                  <Chip
                    label={`~${formatDuration(confirmDialog.workflow.estimatedDuration)}`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>

              <Typography variant="body2" color="warning.main">
                This workflow requires confirmation before execution. Are you sure you want to proceed?
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelExecution}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmExecution}
            variant="contained"
            color="primary"
            disabled={executing !== null}
            startIcon={executing ? <CircularProgress size={16} /> : <PlayArrow />}
          >
            {executing ? 'Executing...' : 'Execute Workflow'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
