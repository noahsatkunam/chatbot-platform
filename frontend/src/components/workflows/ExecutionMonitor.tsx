import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Tooltip,
  Badge,
  Avatar,
  Divider,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Schedule as ScheduleIcon,
  Pause as PauseIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { useWorkflowExecutions } from '../../hooks/useWorkflowExecutions';
import { useWebSocket } from '../../hooks/useWebSocket';

interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'success' | 'error' | 'cancelled' | 'waiting';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  triggeredBy: string;
  triggerType: 'manual' | 'webhook' | 'schedule' | 'chat';
  input: any;
  output?: any;
  error?: string;
  steps: ExecutionStep[];
  resourceUsage: {
    cpu: number;
    memory: number;
    duration: number;
  };
}

interface ExecutionStep {
  id: string;
  nodeId: string;
  nodeName: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
}

export const ExecutionMonitor: React.FC = () => {
  const {
    executions,
    stats,
    loading,
    error,
    fetchExecutions,
    stopExecution,
    retryExecution,
    deleteExecution,
    getExecutionDetails
  } = useWorkflowExecutions();

  const { socket, isConnected } = useWebSocket();

  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterWorkflow, setFilterWorkflow] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  useEffect(() => {
    fetchExecutions();
  }, []);

  // Auto-refresh executions
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchExecutions();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleExecutionUpdate = (data: any) => {
      fetchExecutions();
    };

    socket.on('workflow:execution:started', handleExecutionUpdate);
    socket.on('workflow:execution:completed', handleExecutionUpdate);
    socket.on('workflow:execution:failed', handleExecutionUpdate);
    socket.on('workflow:execution:step', handleExecutionUpdate);

    return () => {
      socket.off('workflow:execution:started', handleExecutionUpdate);
      socket.off('workflow:execution:completed', handleExecutionUpdate);
      socket.off('workflow:execution:failed', handleExecutionUpdate);
      socket.off('workflow:execution:step', handleExecutionUpdate);
    };
  }, [socket, isConnected]);

  const handleViewDetails = async (execution: WorkflowExecution) => {
    try {
      const details = await getExecutionDetails(execution.id);
      setSelectedExecution(details);
      setDetailsDialog(true);
    } catch (error) {
      console.error('Failed to fetch execution details:', error);
    }
  };

  const handleStopExecution = async (executionId: string) => {
    try {
      await stopExecution(executionId);
      fetchExecutions();
    } catch (error) {
      console.error('Failed to stop execution:', error);
    }
  };

  const handleRetryExecution = async (executionId: string) => {
    try {
      await retryExecution(executionId);
      fetchExecutions();
    } catch (error) {
      console.error('Failed to retry execution:', error);
    }
  };

  const handleDeleteExecution = async (executionId: string) => {
    try {
      await deleteExecution(executionId);
      fetchExecutions();
    } catch (error) {
      console.error('Failed to delete execution:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'info';
      case 'success': return 'success';
      case 'error': return 'error';
      case 'cancelled': return 'default';
      case 'waiting': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <PlayIcon />;
      case 'success': return <SuccessIcon />;
      case 'error': return <ErrorIcon />;
      case 'cancelled': return <StopIcon />;
      case 'waiting': return <ScheduleIcon />;
      default: return <PauseIcon />;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const filteredExecutions = executions.filter(execution => {
    const matchesStatus = filterStatus === 'all' || execution.status === filterStatus;
    const matchesWorkflow = filterWorkflow === 'all' || execution.workflowId === filterWorkflow;
    return matchesStatus && matchesWorkflow;
  });

  const runningExecutions = executions.filter(e => e.status === 'running');
  const uniqueWorkflows = Array.from(new Set(executions.map(e => ({ id: e.workflowId, name: e.workflowName }))));

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Execution Monitor
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Badge badgeContent={runningExecutions.length} color="primary">
            <Chip
              icon={isConnected ? <SuccessIcon /> : <ErrorIcon />}
              label={isConnected ? 'Connected' : 'Disconnected'}
              color={isConnected ? 'success' : 'error'}
              size="small"
            />
          </Badge>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchExecutions}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Running
              </Typography>
              <Typography variant="h4" color="info.main">
                {stats?.running || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Completed Today
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats?.completedToday || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Failed Today
              </Typography>
              <Typography variant="h4" color="error.main">
                {stats?.failedToday || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Avg Duration
              </Typography>
              <Typography variant="h4">
                {formatDuration(stats?.avgDuration)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            label="Status"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="running">Running</MenuItem>
            <MenuItem value="success">Success</MenuItem>
            <MenuItem value="error">Error</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
            <MenuItem value="waiting">Waiting</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Workflow</InputLabel>
          <Select
            value={filterWorkflow}
            label="Workflow"
            onChange={(e) => setFilterWorkflow(e.target.value)}
          >
            <MenuItem value="all">All Workflows</MenuItem>
            {uniqueWorkflows.map((workflow) => (
              <MenuItem key={workflow.id} value={workflow.id}>
                {workflow.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant={autoRefresh ? 'contained' : 'outlined'}
          onClick={() => setAutoRefresh(!autoRefresh)}
          size="small"
        >
          Auto Refresh
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Executions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Workflow</TableCell>
              <TableCell>Trigger</TableCell>
              <TableCell>Started</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && executions.length === 0 ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><LinearProgress /></TableCell>
                  <TableCell><LinearProgress /></TableCell>
                  <TableCell><LinearProgress /></TableCell>
                  <TableCell><LinearProgress /></TableCell>
                  <TableCell><LinearProgress /></TableCell>
                  <TableCell><LinearProgress /></TableCell>
                  <TableCell><LinearProgress /></TableCell>
                </TableRow>
              ))
            ) : (
              filteredExecutions.map((execution) => {
                const completedSteps = execution.steps.filter(s => s.status === 'success').length;
                const totalSteps = execution.steps.length;
                const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

                return (
                  <TableRow key={execution.id} hover>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(execution.status)}
                        label={execution.status}
                        color={getStatusColor(execution.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {execution.workflowName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={execution.triggerType}
                        size="small"
                        variant="outlined"
                      />
                      <Typography variant="caption" display="block" color="text.secondary">
                        by {execution.triggeredBy}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(execution.startTime).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDuration(execution.duration)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption">
                          {completedSteps}/{totalSteps}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(execution)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {execution.status === 'running' && (
                          <Tooltip title="Stop">
                            <IconButton
                              size="small"
                              onClick={() => handleStopExecution(execution.id)}
                              color="error"
                            >
                              <StopIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {execution.status === 'error' && (
                          <Tooltip title="Retry">
                            <IconButton
                              size="small"
                              onClick={() => handleRetryExecution(execution.id)}
                              color="primary"
                            >
                              <RefreshIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteExecution(execution.id)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Execution Details Dialog */}
      <Dialog
        open={detailsDialog}
        onClose={() => setDetailsDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Execution Details: {selectedExecution?.workflowName}
          <Typography variant="body2" color="text.secondary">
            ID: {selectedExecution?.id}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedExecution && (
            <Box>
              {/* Execution Info */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Execution Info
                    </Typography>
                    <Typography variant="body2">
                      <strong>Status:</strong> {selectedExecution.status}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Started:</strong> {new Date(selectedExecution.startTime).toLocaleString()}
                    </Typography>
                    {selectedExecution.endTime && (
                      <Typography variant="body2">
                        <strong>Ended:</strong> {new Date(selectedExecution.endTime).toLocaleString()}
                      </Typography>
                    )}
                    <Typography variant="body2">
                      <strong>Duration:</strong> {formatDuration(selectedExecution.duration)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Triggered by:</strong> {selectedExecution.triggeredBy}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Resource Usage
                    </Typography>
                    <Typography variant="body2">
                      <strong>CPU:</strong> {selectedExecution.resourceUsage.cpu}%
                    </Typography>
                    <Typography variant="body2">
                      <strong>Memory:</strong> {selectedExecution.resourceUsage.memory}MB
                    </Typography>
                    <Typography variant="body2">
                      <strong>Duration:</strong> {formatDuration(selectedExecution.resourceUsage.duration)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Error Message */}
              {selectedExecution.error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  <Typography variant="subtitle2">Error:</Typography>
                  <Typography variant="body2">{selectedExecution.error}</Typography>
                </Alert>
              )}

              {/* Step Timeline */}
              <Typography variant="h6" gutterBottom>
                Execution Steps
              </Typography>
              <Timeline>
                {selectedExecution.steps.map((step, index) => (
                  <TimelineItem key={step.id}>
                    <TimelineOppositeContent sx={{ m: 'auto 0' }} variant="body2" color="text.secondary">
                      {step.startTime && new Date(step.startTime).toLocaleTimeString()}
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                      <TimelineDot color={getStatusColor(step.status) as any}>
                        {getStatusIcon(step.status)}
                      </TimelineDot>
                      {index < selectedExecution.steps.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent sx={{ py: '12px', px: 2 }}>
                      <Typography variant="h6" component="span">
                        {step.nodeName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Status: {step.status}
                        {step.duration && ` • Duration: ${formatDuration(step.duration)}`}
                      </Typography>
                      {step.error && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          {step.error}
                        </Alert>
                      )}
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>

              {/* Input/Output */}
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Input Data
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={JSON.stringify(selectedExecution.input, null, 2)}
                    variant="outlined"
                    InputProps={{ readOnly: true }}
                    sx={{ fontFamily: 'monospace' }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Output Data
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={JSON.stringify(selectedExecution.output || {}, null, 2)}
                    variant="outlined"
                    InputProps={{ readOnly: true }}
                    sx={{ fontFamily: 'monospace' }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog(false)}>Close</Button>
          {selectedExecution?.status === 'error' && (
            <Button
              onClick={() => {
                if (selectedExecution) {
                  handleRetryExecution(selectedExecution.id);
                  setDetailsDialog(false);
                }
              }}
              variant="contained"
              color="primary"
            >
              Retry
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};
