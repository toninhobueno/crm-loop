import React, { useState, useEffect, useRef, useContext } from "react";
import { parseISO, format } from "date-fns";
import * as Yup from "yup";
import { Formik, FieldArray, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import { useMediaQuery } from "@material-ui/core";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import CircularProgress from "@material-ui/core/CircularProgress";
import Switch from "@material-ui/core/Switch";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Box from "@material-ui/core/Box";
import Divider from "@material-ui/core/Divider";
import Avatar from "@material-ui/core/Avatar";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Paper from "@material-ui/core/Paper";

import PersonIcon from "@material-ui/icons/Person";
import PhoneIcon from "@material-ui/icons/Phone";
import EmailIcon from "@material-ui/icons/Email";
import CakeIcon from "@material-ui/icons/Cake";
import LabelIcon from "@material-ui/icons/Label";
import AssignmentIndIcon from "@material-ui/icons/AssignmentInd";
import InfoIcon from "@material-ui/icons/Info";
import AndroidIcon from "@material-ui/icons/Android";
import VerifiedUserIcon from "@material-ui/icons/VerifiedUser";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import CloseIcon from "@material-ui/icons/Close";
import SaveIcon from "@material-ui/icons/Save";
import AccountTreeIcon from "@material-ui/icons/AccountTree";

import Grid from '@mui/material/Grid';
import Autocomplete from '@mui/material/Autocomplete';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { TagsContainer } from "../TagsContainer";
import { AuthContext } from "../../context/Auth/AuthContext";
// import AsyncSelect from "../AsyncSelect";

const useStyles = makeStyles(theme => ({
	root: {
		display: "flex",
		flexWrap: "wrap",
	},
	dialogPaper: {
		minHeight: '80vh',
		maxHeight: '90vh',
		minWidth: '800px',
		[theme.breakpoints.down('xs')]: {
			minWidth: '100vw',
			maxWidth: '100vw',
			minHeight: '100vh',
			maxHeight: '100vh',
			margin: 0,
			borderRadius: 0,
		},
		[theme.breakpoints.down('sm')]: {
			minWidth: '95vw',
			maxWidth: '95vw',
			minHeight: '90vh',
			maxHeight: '95vh',
			margin: theme.spacing(1),
			borderRadius: '8px',
		},
		[theme.breakpoints.down('md')]: {
			minWidth: '90vw',
			maxWidth: '90vw',
		},
	},
	dialogTitle: {
		backgroundColor: theme.palette.primary.main,
		color: '#fff',
		padding: theme.spacing(2.5),
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		[theme.breakpoints.down('xs')]: {
			padding: theme.spacing(2),
			flexDirection: 'column',
			gap: theme.spacing(1),
			alignItems: 'flex-start',
		},
		[theme.breakpoints.down('sm')]: {
			padding: theme.spacing(2),
		},
	},
	titleContent: {
		display: 'flex',
		alignItems: 'center',
		gap: theme.spacing(2),
		[theme.breakpoints.down('xs')]: {
			gap: theme.spacing(1),
			width: '100%',
		},
	},
	avatar: {
		width: theme.spacing(6),
		height: theme.spacing(6),
		backgroundColor: '#fff',
		color: theme.palette.primary.main,
		fontSize: '1.8rem',
		[theme.breakpoints.down('xs')]: {
			width: theme.spacing(5),
			height: theme.spacing(5),
			fontSize: '1.5rem',
		},
	},
	tabs: {
		borderBottom: '1px solid #e0e0e0',
		backgroundColor: '#fafafa',
		[theme.breakpoints.down('xs')]: {
			'& .MuiTabs-flexContainer': {
				flexDirection: 'column',
			},
		},
	},
	tab: {
		minHeight: 60,
		textTransform: 'none',
		fontSize: '0.95rem',
		fontWeight: 600,
		'&.Mui-selected': {
			color: '#667eea',
		},
		[theme.breakpoints.down('xs')]: {
			minHeight: 48,
			fontSize: '0.85rem',
			padding: theme.spacing(1),
		},
		[theme.breakpoints.down('sm')]: {
			minHeight: 50,
			fontSize: '0.9rem',
		},
	},
	tabPanel: {
		padding: theme.spacing(3),
		minHeight: 400,
		[theme.breakpoints.down('xs')]: {
			padding: theme.spacing(2),
			minHeight: 300,
		},
		[theme.breakpoints.down('sm')]: {
			padding: theme.spacing(2.5),
			minHeight: 350,
		},
	},
	textField: {
		marginBottom: theme.spacing(2),
		'& .MuiOutlinedInput-root': {
			'&:hover fieldset': {
				borderColor: '#667eea',
			},
			'&.Mui-focused fieldset': {
				borderColor: '#667eea',
			},
		},
		[theme.breakpoints.down('xs')]: {
			marginBottom: theme.spacing(1.5),
			'& .MuiInputBase-input': {
				fontSize: '1rem',
				padding: theme.spacing(1.5),
			},
		},
	},
	sectionCard: {
		marginBottom: theme.spacing(3),
		border: '1px solid #e0e0e0',
		borderRadius: theme.spacing(1),
		overflow: 'visible',
		[theme.breakpoints.down('xs')]: {
			marginBottom: theme.spacing(2),
			borderRadius: theme.spacing(0.5),
		},
	},
	sectionHeader: {
		display: 'flex',
		alignItems: 'center',
		gap: theme.spacing(1),
		marginBottom: theme.spacing(2),
		padding: theme.spacing(1.5),
		backgroundColor: '#f5f5f5',
		borderRadius: theme.spacing(0.5),
		[theme.breakpoints.down('xs')]: {
			padding: theme.spacing(1),
			gap: theme.spacing(0.5),
			marginBottom: theme.spacing(1.5),
		},
	},
	sectionIcon: {
		color: theme.palette.primary.main,
		[theme.breakpoints.down('xs')]: {
			fontSize: '1.2rem',
		},
	},
	extraAttr: {
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		gap: theme.spacing(1),
		marginBottom: theme.spacing(1),
		[theme.breakpoints.down('xs')]: {
			flexDirection: 'column',
			gap: theme.spacing(0.5),
		},
	},
	btnWrapper: {
		position: "relative",
	},
	buttonProgress: {
		color: green[500],
		position: "absolute",
		top: "50%",
		left: "50%",
		marginTop: -12,
		marginLeft: -12,
	},
	infoChip: {
		display: 'flex',
		alignItems: 'center',
		gap: theme.spacing(1),
		padding: theme.spacing(1.5),
		backgroundColor: '#e3f2fd',
		borderRadius: theme.spacing(1),
		border: '1px solid #90caf9',
		marginBottom: theme.spacing(2),
		[theme.breakpoints.down('xs')]: {
			padding: theme.spacing(1),
			gap: theme.spacing(0.5),
			marginBottom: theme.spacing(1.5),
			flexDirection: 'column',
			alignItems: 'flex-start',
		},
	},
	statusBadge: {
		display: 'inline-flex',
		alignItems: 'center',
		padding: '6px 12px',
		borderRadius: 20,
		fontSize: '0.875rem',
		fontWeight: 600,
		gap: theme.spacing(0.5),
		[theme.breakpoints.down('xs')]: {
			fontSize: '0.8rem',
			padding: '4px 8px',
		},
	},
	activeStatus: {
		backgroundColor: '#e8f5e9',
		color: '#2e7d32',
		border: '1px solid #4caf50',
	},
	inactiveStatus: {
		backgroundColor: '#ffebee',
		color: '#c62828',
		border: '1px solid #f44336',
	},
	floupCard: {
		padding: theme.spacing(2),
		backgroundColor: '#fff3e0',
		border: '2px solid #ff9800',
		borderRadius: theme.spacing(1),
		marginTop: theme.spacing(2),
		[theme.breakpoints.down('xs')]: {
			padding: theme.spacing(1.5),
			marginTop: theme.spacing(1.5),
		},
	},
	floupCardInactive: {
		padding: theme.spacing(2),
		backgroundColor: '#fafafa',
		border: '1px solid #e0e0e0',
		borderRadius: theme.spacing(1),
		marginTop: theme.spacing(2),
		[theme.breakpoints.down('xs')]: {
			padding: theme.spacing(1.5),
			marginTop: theme.spacing(1.5),
		},
	},
	inputIcon: {
		color: theme.palette.primary.main,
		marginRight: theme.spacing(1),
		[theme.breakpoints.down('xs')]: {
			fontSize: '1.2rem',
		},
	},
	dialogActions: {
		padding: theme.spacing(2.5),
		backgroundColor: '#fafafa',
		borderTop: '1px solid #e0e0e0',
		gap: theme.spacing(1),
		[theme.breakpoints.down('xs')]: {
			padding: theme.spacing(2),
			flexDirection: 'column',
			gap: theme.spacing(1.5),
		},
		[theme.breakpoints.down('sm')]: {
			padding: theme.spacing(2),
		},
	},
}));

// Componente TabPanel
function TabPanel(props) {
	const { children, value, index, ...other } = props;

	return (
		<div
			role="tabpanel"
			hidden={value !== index}
			id={`contact-tabpanel-${index}`}
			aria-labelledby={`contact-tab-${index}`}
			{...other}
		>
			{value === index && (
				<Box p={3}>
					{children}
				</Box>
			)}
		</div>
	);
}

const formatDateForInput = (date) => {
	if (!date) return '';
	
	// Se já está no formato YYYY-MM-DD, retorna como está
	if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return date;
	}
	
	// Se é uma data ISO ou objeto Date, converte para YYYY-MM-DD
	const d = new Date(date);
	if (isNaN(d.getTime())) return '';
	
	// Usar métodos locais para evitar problemas de timezone
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	
	return `${year}-${month}-${day}`;
};
  
const parseDateFromInput = (dateString) => {
	if (!dateString) return null;
	
	// Se já está no formato YYYY-MM-DD, retorna como está
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
		return dateString;
	}
	
	// Se é uma data ISO, extrai apenas a parte da data
	if (dateString.includes('T')) {
		return dateString.split('T')[0];
	}
	
	return dateString;
};

const ContactSchema = Yup.object().shape({
	name: Yup.string()
		.min(2, "Too Short!")
		.max(250, "Too Long!")
		.required("Required"),
	number: Yup.string().min(8, "Too Short!").max(50, "Too Long!"),
	email: Yup.string().email("Invalid email"),
});

const ContactModal = ({ open, onClose, contactId, initialValues, onSave }) => {
	const classes = useStyles();
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
	const isExtraSmall = useMediaQuery(theme.breakpoints.down('xs'));
	const isMounted = useRef(true);
	const { user } = useContext(AuthContext);

	const initialState = {
		name: "",
		number: "",
		email: "",
		disableBot: false,
		lgpdAcceptedAt: "",
		birthDate: ""
	};

	const [contact, setContact] = useState(initialState);
	const [disableBot, setDisableBot] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const [selectedQueue, setSelectedQueue] = useState(null);
	const [queues, setQueues] = useState([]);
	const [allQueues, setAllQueues] = useState([]);
	const [options, setOptions] = useState([]);
	const [loading, setLoading] = useState(false);
	const [searchParam, setSearchParam] = useState("");
	const [activeFloup, setActiveFloup] = useState(null);
	const [loadingFloup, setLoadingFloup] = useState(false);
	const [tabValue, setTabValue] = useState(0);
	const [showAllUsers, setShowAllUsers] = useState(false);


	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	// Carregar usuários quando abre o modal ou troca para aba de Carteira
	useEffect(() => {
		if (!open) return;

		// Carregar ao abrir o modal ou ao ir para aba Carteira
		const shouldLoad = tabValue === 2 || options.length === 0;
		
		if (shouldLoad) {
			const fetchUsers = async () => {
				try {
					setLoading(true);
					const { data } = await api.get("/users/");
					
					// Tentar diferentes formatos de resposta
					let usersList = [];
					if (Array.isArray(data)) {
						usersList = data;
					} else if (data.users && Array.isArray(data.users)) {
						usersList = data.users;
					}
					
					setOptions(usersList);
					setLoading(false);
				} catch (err) {
					setLoading(false);
					toastError(err);
				}
			};
			
			fetchUsers();
		}
	}, [open, tabValue]);

	// Buscar usuários com filtro quando digita
	useEffect(() => {
		if (!open || searchParam.length < 3) {
			return;
		}

		const delayDebounceFn = setTimeout(() => {
			setLoading(true);
			const fetchUsers = async () => {
				try {
					const { data } = await api.get("/users/", {
						params: { searchParam },
					});
					setOptions(data.users || []);
					setLoading(false);
				} catch (err) {
					setLoading(false);
					toastError(err);
				}
			};

			fetchUsers();
		}, 500);
		return () => clearTimeout(delayDebounceFn);
	}, [searchParam, open]);

	useEffect(() => {
		const fetchContact = async () => {
		  if (initialValues) {
			setContact(prevState => {
			  return { 
				...prevState, 
				...initialValues,
				// Formatar a data corretamente
				birthDate: formatDateForInput(initialValues.birthDate)
			  };
			});
		  }

			if (!contactId) {
				setActiveFloup(null);
				return;
			}

			try {
				const { data } = await api.get(`/contacts/${contactId}`);
				if (isMounted.current) {
					const contactData = {
						...data,
						birthDate: formatDateForInput(data.birthDate)
					};
					setContact(contactData);
					setDisableBot(data.disableBot)

					// Preenche automaticamente os campos de Wallet e Queue
					if (data.contactWallets && data.contactWallets.length > 0) {
						const wallet = data.contactWallets[0].wallet;
						const queue = data.contactWallets[0].queue;

						// Buscar o usuário completo com todos os seus departamentos
						try {
							const userResponse = await api.get(`/users/${wallet.id}`);
							const fullUser = userResponse.data;
							
							setSelectedUser({
								id: fullUser.id,
								name: fullUser.name,
								queues: fullUser.queues || []
							});
							
							// Seta o departamento atual
							setSelectedQueue(queue.id);
							
							// Seta todos os departamentos do usuário (não apenas o atual)
							setQueues(fullUser.queues || [{ id: queue.id, name: queue.name }]);
						} catch (err) {
							// Se falhar ao buscar usuário completo, usa dados básicos
							setSelectedUser({
								id: wallet.id,
								name: wallet.name,
							});
							setSelectedQueue(queue.id);
							setQueues([{ id: queue.id, name: queue.name }]);
						}
					} else {
						// Limpa os valores quando não há contactWallets
						setSelectedUser(null);
						setSelectedQueue(null);
						setQueues([]);
					}
				}

				// Buscar Floup ativo do contato
				setLoadingFloup(true);
				try {
					const floupResponse = await api.get(`/plugins/floup/contact/${contactId}/active`);
					if (isMounted.current) {
						setActiveFloup(floupResponse.data);
					}
				} catch (floupErr) {
					// Se não encontrar Floup ativo, não é erro, apenas não há Floup
					if (isMounted.current) {
						setActiveFloup(null);
					}
				} finally {
					if (isMounted.current) {
						setLoadingFloup(false);
					}
				}
			} catch (err) {
				toastError(err);
			}
		};

		fetchContact();
	}, [contactId, open, initialValues]);

	const handleClose = () => {
		onClose();
		setContact(initialState);
		setSelectedUser(null);
		setSelectedQueue(null);
		setQueues([]);
		setActiveFloup(null);
		setTabValue(0);
	};

	const handleTabChange = (event, newValue) => {
		setTabValue(newValue);
	};

	const handleSaveContact = async values => {
		try {
		  // Validar se tentou atribuir carteira com usuário inválido
		  if (selectedUser && !options.find(u => u.id === selectedUser.id)) {
			toast.error("❌ Atendente selecionado não é válido. Selecione um atendente da lista.");
			setTabValue(2); // Vai para aba de Carteira
			return;
		  }

		  // Validar se selecionou usuário mas não selecionou departamento
		  if (selectedUser && queues.length > 0 && !selectedQueue) {
			toast.error("❌ Selecione um departamento de atendimento para o usuário " + selectedUser.name);
			setTabValue(2); // Vai para aba de Carteira
			return;
		  }

		  // Validar se selecionou usuário sem departamentos disponíveis
		  if (selectedUser && queues.length === 0) {
			toast.error("❌ O atendente " + selectedUser.name + " não possui departamentos atribuídos. Configure os departamentos do usuário primeiro.");
			setTabValue(2); // Vai para aba de Carteira
			return;
		  }

		  // Preparar os dados com a data corretamente formatada
		  const contactData = {
			...values,
			disableBot: disableBot,
			birthDate: parseDateFromInput(values.birthDate)
		  };
	  
		  if (contactId) {
			if (!selectedUser && !selectedQueue) {
			  delete contact.contactWallets;
			  await api.delete(`/contacts/wallet/${contactId}`);
			}
	  
			const { contactWallets, ...valuesWithoutWallets } = contactData;
			delete contact.contactWallets;
	  
			await api.put(`/contacts/${contactId}`, contactData);
	  
			if (selectedUser && selectedQueue && selectedUser !== null && selectedQueue !== null) {
			  await api.put(`/contacts/wallet/${contactId}`, {
				wallets: {
				  userId: selectedUser.id,
				  queueId: selectedQueue,
				},
			  });
			}
	  
			handleClose();
	  
		  } else {
			delete contactData.contactWallets;
	  
			const { data } = await api.post("/contacts", contactData);
	  
			if (data.id && selectedUser && selectedQueue) {
			  await api.put(`/contacts/wallet/${data.id}`, {
				wallets: {
				  userId: selectedUser.id,
				  queueId: selectedQueue,
				},
			  });
			}
	  
			if (onSave) {
			  onSave(data);
			}
	  
			handleClose();
		  }
		  toast.success(i18n.t("contactModal.success"));
		} catch (err) {
		  toastError(err);
		}
	  };

	return (
		<div className={classes.root}>
			<Dialog 
				open={open} 
				onClose={handleClose} 
				maxWidth="lg" 
				fullWidth
				fullScreen={isExtraSmall}
				scroll="paper"
				disableEnforceFocus={true}
				disableAutoFocus={true}
				disableRestoreFocus={true}
				PaperProps={{
					className: classes.dialogPaper,
					style: {
						zIndex: 10003,
						position: 'fixed',
						...(isExtraSmall && {
							margin: 0,
							maxHeight: '100vh',
							height: '100vh',
							maxWidth: '100vw',
							width: '100vw',
							borderRadius: 0,
						})
					}
				}}
				BackdropProps={{
					style: {
						zIndex: 10002,
						backgroundColor: 'rgba(0, 0, 0, 0.5)',
						position: 'fixed'
					}
				}}
				style={{
					zIndex: 10003,
					position: 'fixed'
				}}
			>
				<DialogTitle className={classes.dialogTitle} disableTypography>
					<div className={classes.titleContent}>
						<Avatar className={classes.avatar}>
							{contactId ? <PersonIcon /> : <PersonIcon />}
						</Avatar>
						<div>
							<Typography variant="h5" style={{ fontWeight: 700 }}>
								{contactId
									? `Editar Contato`
									: `Novo Contato`}
							</Typography>
							<Typography variant="body2" style={{ opacity: 0.9 }}>
								{contactId ? `ID: ${contactId} - ${contact.name}` : 'Preencha os dados do novo contato'}
							</Typography>
						</div>
					</div>
					<IconButton onClick={handleClose} style={{ color: '#fff' }}>
						<CloseIcon />
					</IconButton>
				</DialogTitle>
				<Formik
					initialValues={contact}
					enableReinitialize={true}
					validationSchema={ContactSchema}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							handleSaveContact(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ values, errors, touched, isSubmitting, setFieldValue}) => (
						<Form>
							<Tabs
								value={tabValue}
								onChange={handleTabChange}
								indicatorColor="primary"
								className={classes.tabs}
								variant={isMobile ? "scrollable" : "fullWidth"}
								scrollButtons={isMobile ? "auto" : "off"}
								orientation={isExtraSmall ? "vertical" : "horizontal"}
							>
								<Tab 
									icon={<PersonIcon />} 
									label="Dados Básicos" 
									className={classes.tab}
								/>
								<Tab 
									icon={<LabelIcon />} 
									label="Tags" 
									className={classes.tab}
								/>
								<Tab 
									icon={<AssignmentIndIcon />} 
									label="Carteira & Atendimento" 
									className={classes.tab}
								/>
								<Tab 
									icon={<InfoIcon />} 
									label="Informações Extras" 
									className={classes.tab}
								/>
							</Tabs>
							
							<DialogContent 
								dividers 
								style={{ 
									padding: 0, 
									minHeight: isMobile ? 300 : 450,
									maxHeight: isExtraSmall ? 'calc(100vh - 200px)' : 'auto',
									overflowY: 'auto'
								}}
							>
								{/* ABA 1: DADOS BÁSICOS */}
								<TabPanel value={tabValue} index={0} className={classes.tabPanel}>
									<Card className={classes.sectionCard}>
										<CardContent>
											<div className={classes.sectionHeader}>
												<PersonIcon className={classes.sectionIcon} />
												<Typography variant="h6" style={{ fontWeight: 600 }}>
													Informações Pessoais
												</Typography>
											</div>
											
											<Field
												as={TextField}
												label="Nome Completo"
												name="name"
												autoFocus
												error={touched.name && Boolean(errors.name)}
												helperText={touched.name && errors.name}
												variant="outlined"
												fullWidth
												className={classes.textField}
												InputProps={{
													startAdornment: <PersonIcon className={classes.inputIcon} />,
												}}
												placeholder="Digite o nome do contato"
											/>
											
											<Grid container spacing={2}>
												<Grid item xs={12} sm={6}>
													<Field
														as={TextField}
														label="WhatsApp / Telefone"
														name="number"
														error={touched.number && Boolean(errors.number)}
														helperText={touched.number && errors.number || "Exemplo: 5513912344321"}
														placeholder="5513912344321"
														variant="outlined"
														fullWidth
														className={classes.textField}
														InputProps={{
															startAdornment: <PhoneIcon className={classes.inputIcon} />,
														}}
													/>
												</Grid>
												<Grid item xs={12} sm={6}>
													<TextField
														label="LID (Linked Device ID)"
														value={contact.lid || "Não disponível"}
														disabled
														fullWidth
														variant="outlined"
														className={classes.textField}
														helperText="Identificador do dispositivo vinculado (somente leitura)"
													/>
												</Grid>
											</Grid>
											
											<Field
												as={TextField}
												label="E-mail"
												name="email"
												error={touched.email && Boolean(errors.email)}
												helperText={touched.email && errors.email}
												placeholder="contato@exemplo.com"
												fullWidth
												variant="outlined"
												className={classes.textField}
												InputProps={{
													startAdornment: <EmailIcon className={classes.inputIcon} />,
												}}
											/>
											
											<Field
												as={TextField}
												label="Data de Nascimento"
												name="birthDate"
												type="date"
												InputLabelProps={{
													shrink: true,
												}}
												fullWidth
												variant="outlined"
												className={classes.textField}
												helperText="Aniversariante do dia receberá mensagem automática"
												InputProps={{
													startAdornment: <CakeIcon className={classes.inputIcon} />,
												}}
												onChange={(e) => {
													const formattedDate = parseDateFromInput(e.target.value);
													setFieldValue('birthDate', formattedDate);
												}}
											/>
										</CardContent>
									</Card>

									{/* Informações de Status */}
									<Card className={classes.sectionCard}>
										<CardContent>
											<div className={classes.sectionHeader}>
												<InfoIcon className={classes.sectionIcon} />
												<Typography variant="h6" style={{ fontWeight: 600 }}>
													Status e Informações do Sistema
												</Typography>
											</div>

											{contact?.whatsapp && (
												<div className={classes.infoChip}>
													<WhatsAppIcon style={{ color: '#25D366' }} />
													<Typography variant="body2">
														<strong>Conexão WhatsApp:</strong> {contact.whatsapp.name}
													</Typography>
												</div>
											)}

											{contact?.lgpdAcceptedAt && (
												<div className={classes.infoChip}>
													<VerifiedUserIcon style={{ color: '#2e7d32' }} />
													<Typography variant="body2">
														<strong>Termos LGPD aceitos em:</strong> {format(new Date(contact.lgpdAcceptedAt), "dd/MM/yyyy 'às' HH:mm")}
													</Typography>
												</div>
											)}

											<div style={{ marginTop: 16 }}>
												<Typography variant="subtitle2" gutterBottom style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
													<AndroidIcon className={classes.sectionIcon} />
													Configuração de Bot
												</Typography>
												<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
													<Switch
														checked={disableBot}
														onChange={() => setDisableBot(!disableBot)}
														name="disableBot"
														color="primary"
													/>
													<Typography variant="body2">
														{disableBot ? 'Bot desabilitado para este contato' : 'Bot habilitado para este contato'}
													</Typography>
												</div>
											</div>
										</CardContent>
									</Card>

									{/* Campo Floup */}
									{loadingFloup ? (
										<Card className={classes.floupCardInactive}>
											<CardContent style={{ textAlign: 'center' }}>
												<CircularProgress size={24} />
												<Typography variant="body2" style={{ marginTop: 8 }}>
													Carregando informações do Floup...
												</Typography>
											</CardContent>
										</Card>
									) : activeFloup ? (
										<Card className={classes.floupCard}>
											<CardContent>
												<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
													<AccountTreeIcon style={{ color: '#ff9800', fontSize: 32 }} />
													<div>
														<Typography variant="h6" style={{ fontWeight: 600, color: '#e65100' }}>
															Floup Ativo
														</Typography>
														<Typography variant="caption" style={{ color: '#f57c00' }}>
															Este contato está em um fluxo automatizado
														</Typography>
													</div>
												</div>
												<Divider style={{ margin: '12px 0' }} />
												<Typography variant="body2" style={{ marginBottom: 8 }}>
													<strong>Nome do Floup:</strong> {activeFloup.name || 'Floup'}
												</Typography>
												<Typography variant="body2" style={{ marginBottom: 8 }}>
													<strong>Progresso:</strong> Etapa {(activeFloup.activeSchedule?.currentStepIndex || 0) + 1} de {(activeFloup.steps || []).length}
												</Typography>
												{activeFloup.activeSchedule?.nextRunAt && (
													<Typography variant="body2" style={{ color: '#e65100' }}>
														<strong>Próxima execução:</strong> {format(new Date(activeFloup.activeSchedule.nextRunAt), "dd/MM/yyyy 'às' HH:mm")}
													</Typography>
												)}
											</CardContent>
										</Card>
									) : (
										<Card className={classes.floupCardInactive}>
											<CardContent>
												<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
													<AccountTreeIcon style={{ color: '#9e9e9e', fontSize: 32 }} />
													<div>
														<Typography variant="body2" color="textSecondary">
															Nenhum Floup ativo para este contato
														</Typography>
													</div>
												</div>
											</CardContent>
										</Card>
									)}
								</TabPanel>

								{/* ABA 2: TAGS */}
								<TabPanel value={tabValue} index={1} className={classes.tabPanel}>
									<Card className={classes.sectionCard}>
										<CardContent>
											<div className={classes.sectionHeader}>
												<LabelIcon className={classes.sectionIcon} />
												<Typography variant="h6" style={{ fontWeight: 600 }}>
													Gerenciar Tags do Contato
												</Typography>
											</div>
											
											<div className={classes.infoChip} style={{ marginBottom: 24 }}>
												<InfoIcon style={{ color: '#1976d2' }} />
												<Typography variant="body2">
													Use tags para organizar e categorizar seus contatos. Você pode selecionar tags existentes ou criar novas digitando e pressionando Enter.
												</Typography>
											</div>

											<TagsContainer contact={contact} className={classes.textField} />
										</CardContent>
									</Card>
								</TabPanel>

								{/* ABA 3: CARTEIRA & ATENDIMENTO */}
								<TabPanel value={tabValue} index={2} className={classes.tabPanel}>
									<Card className={classes.sectionCard}>
										<CardContent>

											<div className={classes.sectionHeader}>
												<AssignmentIndIcon className={classes.sectionIcon} />
												<Typography variant="h6" style={{ fontWeight: 600 }}>
													Atribuir Carteira de Atendimento
												</Typography>
											</div>

											<div className={classes.infoChip} style={{ marginBottom: 24 }}>
												<InfoIcon style={{ color: '#1976d2' }} />
												<Typography variant="body2">
													Atribua este contato a um atendente e um departamento específico para organizar o atendimento.
												</Typography>
											</div>

											<Grid container spacing={3}>
												<Grid item xs={12} sm={6}>
													{/* Header com botão Ver Todos */}
													<div style={{ 
														display: 'flex', 
														justifyContent: 'space-between', 
														alignItems: 'center',
														marginBottom: 12
													}}>
														<Typography variant="subtitle2" style={{ fontWeight: 600, color: '#666' }}>
															👤 Atendente {selectedUser && `(${selectedUser.name})`}
														</Typography>
														{options.length > 0 && (
															<Button
																type="button"
																size="small"
																variant={showAllUsers ? "contained" : "outlined"}
																color="primary"
																onClick={(e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	setShowAllUsers(!showAllUsers);
																}}
																style={{
																	fontSize: '0.75rem',
																	textTransform: 'none',
																	minWidth: 120
																}}
															>
																{showAllUsers ? '▲' : '▼'} Ver todos ({options.length})
															</Button>
														)}
													</div>

													{/* Mensagem quando não há usuários */}
													{!loading && options.length === 0 && (
														<div style={{ 
															padding: 16, 
															backgroundColor: '#ffebee',
															border: '1px solid #ef5350',
															borderRadius: 4,
															marginBottom: 12,
															textAlign: 'center'
														}}>
															<Typography variant="body2" style={{ color: '#c62828', fontWeight: 600, marginBottom: 4 }}>
																⚠️ Nenhum atendente cadastrado
															</Typography>
															<Typography variant="caption" style={{ color: '#d32f2f' }}>
																Para atribuir carteira, cadastre usuários no sistema.
															</Typography>
														</div>
													)}

													{/* Lista de usuários (colapsável) */}
													{showAllUsers && options.length > 0 && !loading && (
														<Paper 
															elevation={2}
															style={{ 
																marginBottom: 12, 
																padding: 8, 
																maxHeight: 200,
																overflowY: 'auto'
															}}
														>
															<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
																{options.map(user => (
																	<Button
																		key={user.id}
																		type="button"
																		fullWidth
																		variant={selectedUser?.id === user.id ? "contained" : "outlined"}
																		color="primary"
																		startIcon={<PersonIcon />}
																		onClick={(e) => {
																			e.preventDefault();
																			e.stopPropagation();
																			setSelectedUser(user);
																			if (user && Array.isArray(user.queues) && user.queues.length > 0) {
																				setQueues(user.queues);
																				// Se só tem 1 departamento, seleciona automaticamente
																				if (user.queues.length === 1) {
																					setSelectedQueue(user.queues[0].id);
																				} else {
																					// Se tem múltiplas, limpa para forçar escolha
																					setSelectedQueue(null);
																				}
																			} else {
																				setQueues([]);
																				setSelectedQueue(null);
																			}
																			setShowAllUsers(false);
																		}}
																		style={{
																			justifyContent: 'flex-start',
																			textTransform: 'none',
																			fontSize: '0.875rem'
																		}}
																	>
																		{user.name}
																		{selectedUser?.id === user.id && (
																			<span style={{ marginLeft: 'auto' }}>✓</span>
																		)}
																	</Button>
																))}
															</div>
														</Paper>
													)}

													{/* Campo de busca compacto */}
													<Autocomplete
														value={selectedUser}
														fullWidth
														options={options}
														size="small"
														getOptionLabel={(option) => option?.name || ''}
														isOptionEqualToValue={(option, value) => option.id === value.id}
														onChange={(e, newValue) => {
															setSelectedUser(newValue);
															if (newValue && Array.isArray(newValue.queues) && newValue.queues.length > 0) {
																setQueues(newValue.queues);
																// Se só tem 1 departamento, seleciona automaticamente
																if (newValue.queues.length === 1) {
																	setSelectedQueue(newValue.queues[0].id);
																} else {
																	// Se tem múltiplas, limpa a seleção para forçar o usuário escolher
																	setSelectedQueue(null);
																}
															} else {
																setQueues([]);
																setSelectedQueue(null);
															}
														}}
														loading={loading}
														openOnFocus
														autoHighlight
														noOptionsText="Nenhum atendente"
														loadingText="Carregando..."
														renderOption={(props, option) => (
															<li {...props} key={option.id}>
																<PersonIcon style={{ marginRight: 8, fontSize: 18 }} color="primary" />
																<span style={{ fontSize: '0.85rem' }}>{option.name}</span>
															</li>
														)}
														renderInput={(params) => (
															<TextField
																{...params}
																variant="outlined"
																placeholder={options.length > 0 ? "Buscar atendente..." : "Sem atendentes"}
																size="small"
																InputProps={{
																	...params.InputProps,
																	endAdornment: (
																		<React.Fragment>
																			{loading ? <CircularProgress color="inherit" size={20} /> : null}
																			{params.InputProps.endAdornment}
																		</React.Fragment>
																	),
																}}
															/>
														)}
													/>
												</Grid>

												<Grid item xs={12} sm={6}>
													<Typography variant="subtitle2" gutterBottom style={{ fontWeight: 600, color: '#666', marginBottom: 12 }}>
														🎯 Departamento de atendimento {selectedQueue && queues.length > 0 && `(${queues.find(q => q.id === selectedQueue)?.name})`}
													</Typography>
													
													{selectedUser && queues.length > 1 && (
														<div style={{
															marginBottom: 8,
															padding: 8,
															backgroundColor: '#e3f2fd',
															borderRadius: 4,
															fontSize: '0.8rem'
														}}>
															<Typography variant="caption" style={{ color: '#1976d2', fontWeight: 600 }}>
																💡 Clique em um departamento abaixo para selecionar
															</Typography>
														</div>
													)}

													{/* Lista de departamentos quando há múltiplos */}
													{selectedUser && queues.length > 0 && (
														<div style={{ marginBottom: 12 }}>
															{queues.map((queue) => (
																<Button
																	key={queue.id}
																	type="button"
																	fullWidth
																	variant={selectedQueue === queue.id ? "contained" : "outlined"}
																	color="primary"
																	onClick={(e) => {
																		e.preventDefault();
																		e.stopPropagation();
																		setSelectedQueue(queue.id);
																	}}
																	style={{
																		justifyContent: 'flex-start',
																		textTransform: 'none',
																		fontSize: '0.875rem',
																		marginBottom: 4
																	}}
																>
																	{queue.name}
																	{selectedQueue === queue.id && (
																		<span style={{ marginLeft: 'auto' }}>✓</span>
																	)}
																</Button>
															))}
														</div>
													)}
													
													{/* Mensagens de ajuda */}
													{!selectedUser && (
														<div style={{
															padding: 16,
															backgroundColor: '#f5f5f5',
															borderRadius: 4,
															textAlign: 'center'
														}}>
															<Typography variant="caption" style={{ color: '#999' }}>
																Selecione um atendente primeiro
															</Typography>
														</div>
													)}
													
													{selectedUser && queues.length === 0 && (
														<div style={{
															padding: 16,
															backgroundColor: '#ffebee',
															border: '1px solid #ef5350',
															borderRadius: 4,
															textAlign: 'center'
														}}>
															<Typography variant="caption" style={{ color: '#c62828', fontWeight: 600 }}>
																⚠️ Este atendente não tem departamentos atribuídos
															</Typography>
														</div>
													)}
												</Grid>
											</Grid>

											{/* Feedback de configuração */}
											{selectedUser && selectedQueue && (
												<div style={{ 
													marginTop: 24, 
													padding: 16, 
													backgroundColor: '#e8f5e9',
													border: '2px solid #4caf50',
													borderRadius: 8
												}}>
													<Typography variant="body2" style={{ color: '#2e7d32', fontWeight: 600 }}>
														✓ Carteira configurada com sucesso!
													</Typography>
													<Typography variant="caption" style={{ color: '#2e7d32' }}>
														Este contato será atendido por <strong>{selectedUser.name}</strong> no departamento <strong>{queues.find(q => q.id === selectedQueue)?.name}</strong>
													</Typography>
												</div>
											)}

											{/* Aviso quando falta selecionar departamento */}
											{selectedUser && queues.length > 1 && !selectedQueue && (
												<div style={{ 
													marginTop: 24, 
													padding: 16, 
													backgroundColor: '#fff3e0',
													border: '2px solid #ff9800',
													borderRadius: 8,
													textAlign: 'center'
												}}>
													<Typography variant="body2" style={{ color: '#e65100', fontWeight: 600 }}>
														⚠️ Atenção: Selecione um departamento
													</Typography>
													<Typography variant="caption" style={{ color: '#e65100' }}>
														O atendente <strong>{selectedUser.name}</strong> possui {queues.length} departamentos. Escolha um para continuar.
													</Typography>
												</div>
											)}
										</CardContent>
									</Card>
								</TabPanel>

								{/* ABA 4: INFORMAÇÕES EXTRAS */}
								<TabPanel value={tabValue} index={3} className={classes.tabPanel}>
									<Card className={classes.sectionCard}>
										<CardContent>
											<div className={classes.sectionHeader}>
												<InfoIcon className={classes.sectionIcon} />
												<Typography variant="h6" style={{ fontWeight: 600 }}>
													Campos Personalizados
												</Typography>
											</div>

											<div className={classes.infoChip} style={{ marginBottom: 24 }}>
												<InfoIcon style={{ color: '#1976d2' }} />
												<Typography variant="body2">
													Adicione campos personalizados para armazenar informações adicionais sobre o contato.
												</Typography>
											</div>

											<FieldArray name="extraInfo">
												{({ push, remove }) => (
													<>
														{values.extraInfo &&
															values.extraInfo.length > 0 ? (
																<div style={{ marginBottom: 16 }}>
																	{values.extraInfo.map((info, index) => (
																		<div
																			className={classes.extraAttr}
																			key={`${index}-info`}
																		>
																			<Field
																				as={TextField}
																				label="Nome do Campo"
																				name={`extraInfo[${index}].name`}
																				variant="outlined"
																				className={classes.textField}
																				placeholder="Ex: CPF, Endereço, Empresa"
																				fullWidth
																			/>
																			<Field
																				as={TextField}
																				label="Valor"
																				name={`extraInfo[${index}].value`}
																				variant="outlined"
																				className={classes.textField}
																				placeholder="Digite o valor"
																				fullWidth
																			/>
																			<IconButton
																				color="secondary"
																				onClick={() => remove(index)}
																				style={{ marginTop: -8 }}
																			>
																				<DeleteOutlineIcon />
																			</IconButton>
																		</div>
																	))}
																</div>
															) : (
																<div style={{ 
																	padding: 32, 
																	textAlign: 'center', 
																	backgroundColor: '#fafafa',
																	borderRadius: 8,
																	border: '2px dashed #e0e0e0'
																}}>
																	<InfoIcon style={{ fontSize: 48, color: '#bdbdbd', marginBottom: 16 }} />
																	<Typography variant="body2" color="textSecondary" gutterBottom>
																		Nenhum campo personalizado adicionado ainda
																	</Typography>
																	<Typography variant="caption" color="textSecondary">
																		Clique no botão abaixo para adicionar o primeiro campo
																	</Typography>
																</div>
															)}
														
														<Button
															fullWidth
															variant="outlined"
															color="primary"
															onClick={() => push({ name: "", value: "" })}
															style={{ 
																marginTop: 16,
																padding: 12,
																borderWidth: 2,
																fontWeight: 600
															}}
														>
															+ Adicionar Campo Personalizado
														</Button>
													</>
												)}
											</FieldArray>
										</CardContent>
									</Card>
								</TabPanel>
							</DialogContent>
							
							<DialogActions className={classes.dialogActions}>
								<Button
									onClick={handleClose}
									disabled={isSubmitting}
									variant="outlined"
									size={isMobile ? "large" : "large"}
									startIcon={<CloseIcon />}
									style={{ 
										minWidth: isMobile ? '100%' : 140,
										borderWidth: 2,
										marginBottom: isMobile ? theme.spacing(1) : 0,
									}}
								>
									Cancelar
								</Button>
								<Button
									type="submit"
									disabled={isSubmitting}
									variant="contained"
									color="primary"
									size={isMobile ? "large" : "large"}
									startIcon={<SaveIcon />}
									className={classes.btnWrapper}
									style={{ 
										minWidth: isMobile ? '100%' : 140,
										fontWeight: 600
									}}
								>
									{contactId ? "Salvar Alterações" : "Criar Contato"}
									{isSubmitting && (
										<CircularProgress
											size={24}
											className={classes.buttonProgress}
											style={{ color: '#fff' }}
										/>
									)}
								</Button>
							</DialogActions>
						</Form>
					)}
				</Formik>
			</Dialog>
		</div>
	);
};

export default ContactModal;
