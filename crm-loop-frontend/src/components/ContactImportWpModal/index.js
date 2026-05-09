import React, { useEffect, useState, useContext } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogActions, 
  DialogContent,
  Button, 
  Box,
  useMediaQuery,
  useTheme
} from '@material-ui/core';
import { i18n } from '../../translate/i18n';
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import { Can } from "../Can";

import { AuthContext } from "../../context/Auth/AuthContext";
import * as XLSX from "xlsx";
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import toastError from '../../errors/toastError';

const useStyles = makeStyles((theme) => ({
  dialog: {
    '& .MuiDialog-paper': {
      margin: theme.spacing(1),
      width: '100%',
      maxWidth: '500px',
      [theme.breakpoints.down('sm')]: {
        margin: theme.spacing(0.5),
        maxWidth: '95vw',
        maxHeight: '95vh',
      },
    },
  },
  dialogTitle: {
    padding: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1.5),
      fontSize: '1.1rem',
    },
  },
  dialogContent: {
    padding: theme.spacing(1, 2),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1),
    },
  },
  multFieldLine: {
    display: "flex",
    marginBottom: theme.spacing(1.5),
    [theme.breakpoints.down('sm')]: {
      marginBottom: theme.spacing(1),
    },
  },
  button: {
    padding: theme.spacing(1.5),
    fontSize: '0.875rem',
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1),
      fontSize: '0.8rem',
    },
  },
  dialogActions: {
    padding: theme.spacing(1, 2, 2),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1),
    },
  },
}));

const ContactImportWpModal = ({ isOpen, handleClose, selectedTags, hideNum, userProfile }) => {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useContext(AuthContext);
  const history = useHistory();

  const initialContact = { name: "", number: "", error: "" }

  const [contactsToImport, setContactsToImport] = useState([])
  const [statusMessage, setStatusMessage] = useState("")
  const [currentContact, setCurrentContact] = useState(initialContact)

  const handleClosed = () => {
    setContactsToImport([])
    setStatusMessage("")
    setCurrentContact(initialContact)
    handleClose()
  }

  useEffect(() => {
    console.log(contactsToImport?.length)
    if (contactsToImport?.length) {
      contactsToImport.map(async (item, index) => {
        setTimeout(async () => {
          try {
            if (index >= contactsToImport?.length - 1) {
              setStatusMessage(`importação concluída com exito a importação`)
              //setContactsToImport([])
              setCurrentContact(initialContact)

              setTimeout(() => {
                handleClosed()
              }, 15000);
            }
            if (index % 5 === 0) {

              setStatusMessage(`importação em andamento ${index} de ${contactsToImport?.length} não saia desta tela até concluir a importação`)
              // toast.info(
              // );
            }
            console.log("antes do import: ", item[0])
            await api.post(`/contactsImport`, {
              name: item.name,
              number: item.number.toString(),
              email: item.email,
              birthDate: item.birthDate,
              tags: item.tags,
              carteira: item.carteira,
            });

            setCurrentContact({ name: item.name, number: item.number, error: "success" })
          } catch (err) {
            setCurrentContact({ name: item.name, number: item.number, error: err })
          }
        }, 330 * index);
      });
    }
  }, [contactsToImport]);

  const handleOnExportContacts = async (model = false) => {
    const allDatas = []; //const { data } = await api.get("/contacts");

    let i = 1;
    if (!model) {
      while (i !== 0) {
        const { data } = await api.get("/contacts/", {
          params: { searchParam: "", pageNumber: i, contactTag: JSON.stringify(selectedTags) },
        });
        console.log(data)
        data.contacts.forEach((element) => {
          const tagsContact = element?.tags?.map(tag => tag?.name).join(', '); 
          // Extrair carteira (email do usuário responsável)
          const carteira = element?.contactWallets && element.contactWallets.length > 0 
            ? element.contactWallets[0].wallet?.email 
            : "";
          const contactWithTags = { ...element, tags: tagsContact, carteira };
          allDatas.push(contactWithTags);
        });

        const pages = data?.count / 20;
        i++;
        if (i > pages) {
          i = 0;
        }
      }
    } else {
      allDatas.push({
        name: "Nome Contato",
        number: "5599999999999",
        email: "email-contato@email.com",
        birthDate: "15-05-1990",
        tags: "tag1, tag2",
        carteira: "funcionario-empresa@email.com",
      });
    }

    const exportData = allDatas.map((e) => {
      return { 
        name: e.name, 
        number: (hideNum && userProfile === "user" ? e.isGroup ? e.number : e.number.slice(0, -6) + "**-**" + e.number.slice(-2) : e.number), 
        email: e.email, 
        birthDate: e.birthDate || "",
        tags: e.tags,
        carteira: e.carteira 
      };
    });
    let wb = XLSX.utils.book_new();
    let ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Contatos");
    XLSX.writeFile(wb, "backup_contatos.xlsx");
  };

  const handleImportChange = (e) => {
    const [file] = e.target.files;
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setContactsToImport(data)
      } catch (err) {
        console.log(err);
        setContactsToImport([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };
  
  const handleimportContact = async () => {
    try {
      history.push('/contacts/import');
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog 
      fullWidth 
      open={isOpen} 
      onClose={handleClosed}
      className={classes.dialog}
      maxWidth="sm"
      fullScreen={isMobile}
    >
      <DialogTitle className={classes.dialogTitle}>
        {i18n.t("Exportar / Importar contatos")}
      </DialogTitle>
      
      <DialogContent className={classes.dialogContent}>
        <Box>
          <Can
            role={user.profile}
            perform="contacts-page:deleteContact"
            yes={() => (
              <div className={classes.multFieldLine}>
                <Button
                  fullWidth
                  size={isMobile ? "medium" : "small"}
                  color="primary"
                  variant="contained"
                  className={classes.button}
                  onClick={() => handleOnExportContacts(false)}
                >
                  {i18n.t("contactImportWpModal.title")}
                </Button>
              </div>
            )}
          />
          
          <div className={classes.multFieldLine}>
            <Button
              fullWidth
              size={isMobile ? "medium" : "small"}
              color="primary"
              variant="contained"
              className={classes.button}
              onClick={() => handleOnExportContacts(true)}
            >
              {i18n.t("contactImportWpModal.buttons.downloadModel")}
            </Button>
          </div>
          
          <div className={classes.multFieldLine}>
            <Button
              fullWidth
              size={isMobile ? "medium" : "small"}
              color="primary"
              variant="contained"
              className={classes.button}
              onClick={() => handleimportContact()}
            >
              {i18n.t("contactImportWpModal.buttons.import")}
            </Button>
          </div>
        </Box>
      </DialogContent>

      <DialogActions className={classes.dialogActions}>
        <Button 
          onClick={handleClose} 
          color="primary"
          size={isMobile ? "medium" : "small"}
        >
          {i18n.t("contactImportWpModal.buttons.closed")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContactImportWpModal;
