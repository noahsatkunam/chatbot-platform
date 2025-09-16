import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Alert,
  Divider,
  Link,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Error,
  OpenInNew,
  ContentCopy,
  Download,
  Share,
  Visibility,
  Code
} from '@mui/icons-material';

interface WorkflowResult {
  id: string;
  workflowName: string;
  executionId: string;
  status: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  data?: any;
  actions?: ResultAction[];
  fields?: ResultField[];
  files?: ResultFile[];
  links?: ResultLink[];
  timestamp: Date;
  duration: number;
}

interface ResultAction {
  id: string;
  type: 'button' | 'link' | 'download';
  label: string;
  url?: string;
  data?: any;
  style?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  icon?: string;
}

interface ResultField {
  name: string;
  value: string;
  type?: 'text' | 'number' | 'date' | 'url' | 'email';
  copyable?: boolean;
}

interface ResultFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

interface ResultLink {
  title: string;
  url: string;
  description?: string;
}

interface WorkflowResultsProps {
  result: WorkflowResult;
  onActionClick?: (action: ResultAction) => void;
  compact?: boolean;
}

export const WorkflowResults: React.FC<WorkflowResultsProps> = ({
  result,
  onActionClick,
  compact = false
}) => {
  const [expanded, setExpanded] = useState(!compact);
  const [rawDataDialog, setRawDataDialog] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'warning':
        return <Error color="warning" />;
      default:
        return <CheckCircle color="success" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'success';
    }
  };

  const formatDuration = (milliseconds: number) => {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleActionClick = (action: ResultAction) => {
    if (action.type === 'link' && action.url) {
      window.open(action.url, '_blank');
    } else if (action.type === 'download' && action.url) {
      const link = document.createElement('a');
      link.href = action.url;
      link.download = action.label;
      link.click();
    } else if (onActionClick) {
      onActionClick(action);
    }
  };

  const renderFieldValue = (field: ResultField) => {
    let displayValue = field.value;
    
    if (field.type === 'url') {
      return (
        <Link href={field.value} target="_blank" rel="noopener">
          {field.value}
        </Link>
      );
    }
    
    if (field.type === 'email') {
      return (
        <Link href={`mailto:${field.value}`}>
          {field.value}
        </Link>
      );
    }
    
    if (field.type === 'date') {
      displayValue = new Date(field.value).toLocaleString();
    }

    return (
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="body2" component="span">
          {displayValue}
        </Typography>
        {field.copyable && (
          <Tooltip title="Copy to clipboard">
            <IconButton
              size="small"
              onClick={() => handleCopyToClipboard(field.value)}
            >
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  };

  return (
    <>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          {/* Header */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              {getStatusIcon(result.status)}
              <Box>
                <Typography variant="subtitle2" fontWeight="medium">
                  {result.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {result.workflowName} • {formatDuration(result.duration)} • {result.timestamp.toLocaleTimeString()}
                </Typography>
              </Box>
            </Box>
            
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={result.status}
                size="small"
                color={getStatusColor(result.status) as any}
                variant="outlined"
              />
              
              {!compact && (result.fields || result.data || result.files || result.links) && (
                <IconButton
                  size="small"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Message */}
          {result.message && (
            <Alert severity={getStatusColor(result.status) as any} sx={{ mb: 2 }}>
              {result.message}
            </Alert>
          )}

          {/* Actions */}
          {result.actions && result.actions.length > 0 && (
            <Box display="flex" gap={1} mb={expanded ? 2 : 0} flexWrap="wrap">
              {result.actions.map((action) => (
                <Button
                  key={action.id}
                  size="small"
                  variant={action.style === 'primary' ? 'contained' : 'outlined'}
                  color={action.style as any || 'primary'}
                  onClick={() => handleActionClick(action)}
                  startIcon={action.type === 'link' ? <OpenInNew /> : action.type === 'download' ? <Download /> : undefined}
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          )}

          {/* Detailed Content */}
          <Collapse in={expanded}>
            <Box>
              {/* Fields */}
              {result.fields && result.fields.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Results
                  </Typography>
                  <List dense>
                    {result.fields.map((field, index) => (
                      <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                        <ListItemText
                          primary={field.name}
                          secondary={renderFieldValue(field)}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Files */}
              {result.files && result.files.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Generated Files
                  </Typography>
                  <List dense>
                    {result.files.map((file, index) => (
                      <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Link href={file.url} target="_blank" rel="noopener">
                                {file.name}
                              </Link>
                              <Chip label={file.type} size="small" variant="outlined" />
                            </Box>
                          }
                          secondary={formatFileSize(file.size)}
                        />
                        <IconButton
                          size="small"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          <Download fontSize="small" />
                        </IconButton>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Links */}
              {result.links && result.links.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Related Links
                  </Typography>
                  <List dense>
                    {result.links.map((link, index) => (
                      <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                        <ListItemText
                          primary={
                            <Link href={link.url} target="_blank" rel="noopener">
                              {link.title}
                            </Link>
                          }
                          secondary={link.description}
                        />
                        <IconButton
                          size="small"
                          onClick={() => window.open(link.url, '_blank')}
                        >
                          <OpenInNew fontSize="small" />
                        </IconButton>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Raw Data */}
              {result.data && (
                <Box>
                  <Divider sx={{ my: 2 }} />
                  <Box display="flex" alignItems="center" justifyContent="between" gap={1}>
                    <Typography variant="subtitle2">
                      Raw Data
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<Code />}
                      onClick={() => setRawDataDialog(true)}
                    >
                      View JSON
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Raw Data Dialog */}
      <Dialog
        open={rawDataDialog}
        onClose={() => setRawDataDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="between">
            <Typography variant="h6">Raw Execution Data</Typography>
            <IconButton
              onClick={() => handleCopyToClipboard(JSON.stringify(result.data, null, 2))}
            >
              <ContentCopy />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            component="pre"
            sx={{
              backgroundColor: 'grey.100',
              p: 2,
              borderRadius: 1,
              overflow: 'auto',
              maxHeight: 400,
              fontSize: '0.875rem',
              fontFamily: 'monospace'
            }}
          >
            {JSON.stringify(result.data, null, 2)}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRawDataDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
