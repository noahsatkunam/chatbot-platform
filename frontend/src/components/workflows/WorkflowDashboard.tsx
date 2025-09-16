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
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Alert,
  Skeleton,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Schedule as ScheduleIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useWorkflows } from '../../hooks/useWorkflows';
import { useAuth } from '../../hooks/useAuth';
import { WorkflowEditor } from './WorkflowEditor';
import { ExecutionMonitor } from './ExecutionMonitor';
import { WorkflowAnalytics } from './WorkflowAnalytics';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  lastExecution: Date | null;
  executionCount: number;
  successRate: number;
  triggers: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface WorkflowStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
}

export const WorkflowDashboard: React.FC = () => {
  const { user } = useAuth();
  const { 
    workflows, 
    stats, 
    loading, 
    error, 
    fetchWorkflows, 
    createWorkflow, 
    updateWorkflow, 
    deleteWorkflow,
    executeWorkflow,
    toggleWorkflowStatus
  } = useWorkflows();

  const [selectedTab, setSelectedTab] = useState<'overview' | 'editor' | 'monitor' | 'analytics'>('overview');
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuWorkflow, setMenuWorkflow] = useState<Workflow | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<Workflow | null>(null);

  // New workflow form state
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    template: '',
    triggers: [] as string[]
  });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, workflow: Workflow) => {
    setAnchorEl(event.currentTarget);
    setMenuWorkflow(workflow);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuWorkflow(null);
  };

  const handleCreateWorkflow = async () => {
    try {
      await createWorkflow(newWorkflow);
      setCreateDialogOpen(false);
      setNewWorkflow({ name: '', description: '', template: '', triggers: [] });
      fetchWorkflows();
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  };

  const handleDeleteWorkflow = async () => {
    if (workflowToDelete) {
      try {
        await deleteWorkflow(workflowToDelete.id);
        setDeleteDialogOpen(false);
        setWorkflowToDelete(null);
        fetchWorkflows();
      } catch (error) {
        console.error('Failed to delete workflow:', error);
      }
    }
  };

  const handleExecuteWorkflow = async (workflow: Workflow) => {
    try {
      await executeWorkflow(workflow.id);
      fetchWorkflows();
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const handleToggleStatus = async (workflow: Workflow) => {
    try {
      await toggleWorkflowStatus(workflow.id);
      fetchWorkflows();
    } catch (error) {
      console.error('Failed to toggle workflow status:', error);
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesStatus = filterStatus === 'all' || workflow.status === filterStatus;
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'draft': return 'warning';
      default: return 'default';
    }
  };

  const renderOverview = () => (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Workflows
              </Typography>
              <Typography variant="h4">
                {loading ? <Skeleton width={60} /> : stats?.totalWorkflows || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Active
              </Typography>
              <Typography variant="h4" color="success.main">
                {loading ? <Skeleton width={60} /> : stats?.activeWorkflows || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Executions
              </Typography>
              <Typography variant="h4">
                {loading ? <Skeleton width={60} /> : stats?.totalExecutions || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Success Rate
              </Typography>
              <Typography variant="h4" color="success.main">
                {loading ? <Skeleton width={60} /> : 
                  stats ? `${Math.round((stats.successfulExecutions / stats.totalExecutions) * 100) || 0}%` : '0%'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Avg Time
              </Typography>
              <Typography variant="h4">
                {loading ? <Skeleton width={60} /> : `${stats?.avgExecutionTime || 0}ms`}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Failed
              </Typography>
              <Typography variant="h4" color="error.main">
                {loading ? <Skeleton width={60} /> : stats?.failedExecutions || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={fetchWorkflows}>
            <RefreshIcon />
          </IconButton>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Workflow
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Workflows Grid */}
      <Grid container spacing={3}>
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="80%" />
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Skeleton variant="rectangular" width={60} height={24} />
                    <Skeleton variant="rectangular" width={80} height={24} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          filteredWorkflows.map((workflow) => (
            <Grid item xs={12} sm={6} md={4} key={workflow.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h2" noWrap>
                      {workflow.name}
                    </Typography>
                    <Box>
                      <Chip 
                        label={workflow.status} 
                        color={getStatusColor(workflow.status) as any}
                        size="small"
                      />
                      <IconButton 
                        size="small" 
                        onClick={(e) => handleMenuOpen(e, workflow)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {workflow.description}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Triggers: {workflow.triggers.join(', ') || 'None'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    {workflow.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
                    <Box>
                      <Typography variant="caption" display="block">
                        Executions: {workflow.executionCount}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Success: {workflow.successRate}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Execute">
                        <IconButton 
                          size="small" 
                          onClick={() => handleExecuteWorkflow(workflow)}
                          disabled={workflow.status !== 'active'}
                        >
                          <PlayIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton 
                          size="small" 
                          onClick={() => {
                            setSelectedWorkflow(workflow);
                            setSelectedTab('editor');
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Workflow Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={selectedTab === 'overview' ? 'contained' : 'outlined'}
            onClick={() => setSelectedTab('overview')}
          >
            Overview
          </Button>
          <Button
            variant={selectedTab === 'editor' ? 'contained' : 'outlined'}
            onClick={() => setSelectedTab('editor')}
            startIcon={<EditIcon />}
          >
            Editor
          </Button>
          <Button
            variant={selectedTab === 'monitor' ? 'contained' : 'outlined'}
            onClick={() => setSelectedTab('monitor')}
            startIcon={<ScheduleIcon />}
          >
            Monitor
          </Button>
          <Button
            variant={selectedTab === 'analytics' ? 'contained' : 'outlined'}
            onClick={() => setSelectedTab('analytics')}
            startIcon={<AnalyticsIcon />}
          >
            Analytics
          </Button>
        </Box>
      </Box>

      {/* Tab Content */}
      {selectedTab === 'overview' && renderOverview()}
      {selectedTab === 'editor' && <WorkflowEditor workflow={selectedWorkflow} />}
      {selectedTab === 'monitor' && <ExecutionMonitor />}
      {selectedTab === 'analytics' && <WorkflowAnalytics />}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (menuWorkflow) {
            setSelectedWorkflow(menuWorkflow);
            setSelectedTab('editor');
          }
          handleMenuClose();
        }}>
          <EditIcon sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => {
          if (menuWorkflow) handleToggleStatus(menuWorkflow);
          handleMenuClose();
        }}>
          {menuWorkflow?.status === 'active' ? <PauseIcon sx={{ mr: 1 }} /> : <PlayIcon sx={{ mr: 1 }} />}
          {menuWorkflow?.status === 'active' ? 'Deactivate' : 'Activate'}
        </MenuItem>
        <MenuItem onClick={() => {
          if (menuWorkflow) handleExecuteWorkflow(menuWorkflow);
          handleMenuClose();
        }}>
          <PlayIcon sx={{ mr: 1 }} /> Execute
        </MenuItem>
        <MenuItem onClick={() => {
          setWorkflowToDelete(menuWorkflow);
          setDeleteDialogOpen(true);
          handleMenuClose();
        }}>
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Create Workflow Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Workflow</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Workflow Name"
            fullWidth
            variant="outlined"
            value={newWorkflow.name}
            onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newWorkflow.description}
            onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Template</InputLabel>
            <Select
              value={newWorkflow.template}
              label="Template"
              onChange={(e) => setNewWorkflow({ ...newWorkflow, template: e.target.value })}
            >
              <MenuItem value="">Blank Workflow</MenuItem>
              <MenuItem value="chat-responder">Chat Auto-Responder</MenuItem>
              <MenuItem value="lead-capture">Lead Capture</MenuItem>
              <MenuItem value="data-sync">Data Synchronization</MenuItem>
              <MenuItem value="notification">Notification System</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateWorkflow} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Workflow</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{workflowToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteWorkflow} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
