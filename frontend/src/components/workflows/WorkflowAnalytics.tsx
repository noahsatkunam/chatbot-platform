import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Skeleton,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Schedule as ScheduleIcon,
  Speed as SpeedIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useWorkflowAnalytics } from '../../hooks/useWorkflowAnalytics';

interface AnalyticsData {
  executionTrends: Array<{
    date: string;
    executions: number;
    success: number;
    failed: number;
    avgDuration: number;
  }>;
  workflowPerformance: Array<{
    workflowId: string;
    workflowName: string;
    executions: number;
    successRate: number;
    avgDuration: number;
    errorRate: number;
  }>;
  triggerAnalytics: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  resourceUsage: Array<{
    date: string;
    cpu: number;
    memory: number;
    executions: number;
  }>;
  errorAnalysis: Array<{
    errorType: string;
    count: number;
    workflows: string[];
    trend: 'up' | 'down' | 'stable';
  }>;
  topWorkflows: Array<{
    id: string;
    name: string;
    executions: number;
    successRate: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const WorkflowAnalytics: React.FC = () => {
  const {
    analytics,
    loading,
    error,
    fetchAnalytics,
    exportAnalytics
  } = useWorkflowAnalytics();

  const [timeRange, setTimeRange] = useState('7d');
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedWorkflow, setSelectedWorkflow] = useState('all');

  useEffect(() => {
    fetchAnalytics(timeRange);
  }, [timeRange]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      await exportAnalytics(timeRange, format);
    } catch (error) {
      console.error('Failed to export analytics:', error);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* Key Metrics */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Total Executions
                    </Typography>
                    <Typography variant="h4">
                      {loading ? <Skeleton width={60} /> : analytics?.totalExecutions || 0}
                    </Typography>
                  </Box>
                  <TimelineIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Success Rate
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {loading ? <Skeleton width={60} /> : `${analytics?.successRate || 0}%`}
                    </Typography>
                  </Box>
                  <SuccessIcon color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Avg Duration
                    </Typography>
                    <Typography variant="h4">
                      {loading ? <Skeleton width={60} /> : formatDuration(analytics?.avgDuration || 0)}
                    </Typography>
                  </Box>
                  <SpeedIcon color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Error Rate
                    </Typography>
                    <Typography variant="h4" color="error.main">
                      {loading ? <Skeleton width={60} /> : `${analytics?.errorRate || 0}%`}
                    </Typography>
                  </Box>
                  <ErrorIcon color="error" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* Execution Trends Chart */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Execution Trends
            </Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics?.executionTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="executions" stroke="#8884d8" name="Total Executions" />
                  <Line type="monotone" dataKey="success" stroke="#82ca9d" name="Successful" />
                  <Line type="monotone" dataKey="failed" stroke="#ff7c7c" name="Failed" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Trigger Distribution */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Trigger Distribution
            </Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics?.triggerAnalytics || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {(analytics?.triggerAnalytics || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Top Performing Workflows */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Performing Workflows
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Workflow</TableCell>
                    <TableCell align="right">Executions</TableCell>
                    <TableCell align="right">Success Rate</TableCell>
                    <TableCell align="right">Trend</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                        <TableCell><Skeleton /></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    (analytics?.topWorkflows || []).map((workflow) => (
                      <TableRow key={workflow.id}>
                        <TableCell>{workflow.name}</TableCell>
                        <TableCell align="right">{workflow.executions}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${workflow.successRate}%`}
                            color={workflow.successRate > 90 ? 'success' : workflow.successRate > 70 ? 'warning' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {workflow.trend === 'up' && <TrendingUpIcon color="success" />}
                          {workflow.trend === 'down' && <TrendingDownIcon color="error" />}
                          {workflow.trend === 'stable' && <span>—</span>}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderPerformanceTab = () => (
    <Grid container spacing={3}>
      {/* Performance Metrics Chart */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Workflow Performance Comparison
            </Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={400} />
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics?.workflowPerformance || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="workflowName" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="executions" fill="#8884d8" name="Executions" />
                  <Bar yAxisId="right" dataKey="successRate" fill="#82ca9d" name="Success Rate %" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Duration Analysis */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Average Duration by Workflow
            </Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics?.workflowPerformance || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="workflowName" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatDuration(value as number)} />
                  <Bar dataKey="avgDuration" fill="#FFBB28" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Resource Usage */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Resource Usage Over Time
            </Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics?.resourceUsage || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="cpu" stackId="1" stroke="#8884d8" fill="#8884d8" name="CPU %" />
                  <Area type="monotone" dataKey="memory" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Memory MB" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderErrorAnalysisTab = () => (
    <Grid container spacing={3}>
      {/* Error Trends */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Error Analysis
            </Typography>
            <List>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <ListItem key={index}>
                    <ListItemIcon><Skeleton variant="circular" width={24} height={24} /></ListItemIcon>
                    <ListItemText
                      primary={<Skeleton width="60%" />}
                      secondary={<Skeleton width="40%" />}
                    />
                  </ListItem>
                ))
              ) : (
                (analytics?.errorAnalysis || []).map((error, index) => (
                  <React.Fragment key={error.errorType}>
                    <ListItem>
                      <ListItemIcon>
                        <ErrorIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">{error.errorType}</Typography>
                            <Chip label={error.count} size="small" color="error" />
                            {error.trend === 'up' && <TrendingUpIcon color="error" fontSize="small" />}
                            {error.trend === 'down' && <TrendingDownIcon color="success" fontSize="small" />}
                          </Box>
                        }
                        secondary={`Affected workflows: ${error.workflows.join(', ')}`}
                      />
                    </ListItem>
                    {index < (analytics?.errorAnalysis || []).length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Error Distribution */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Error Distribution
            </Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics?.errorAnalysis || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ errorType, count }) => `${errorType}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {(analytics?.errorAnalysis || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Workflow Analytics
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="1d">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchAnalytics(timeRange)}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('pdf')}
          >
            Export PDF
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Overview" icon={<AssessmentIcon />} />
        <Tab label="Performance" icon={<SpeedIcon />} />
        <Tab label="Error Analysis" icon={<ErrorIcon />} />
      </Tabs>

      {/* Tab Content */}
      {selectedTab === 0 && renderOverviewTab()}
      {selectedTab === 1 && renderPerformanceTab()}
      {selectedTab === 2 && renderErrorAnalysisTab()}
    </Box>
  );
};
