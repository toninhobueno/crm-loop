import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { CircularProgress, Typography } from "@material-ui/core";

import ModalImage from "react-modal-image";
import api from "../../services/api";

const useStyles = makeStyles(theme => ({
	messageMedia: {
		objectFit: "cover",
		width: 250,
		height: "auto", // Redimensionar automaticamente a altura para manter a proporção
		borderTopLeftRadius: 8,
		borderTopRightRadius: 8,
		borderBottomLeftRadius: 8,
		borderBottomRightRadius: 8,
	},
	loadingContainer: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		width: 250,
		height: 150,
		backgroundColor: "#f0f0f0",
		borderRadius: 8,
		gap: 8,
	}
}));

const ModalImageCors = ({ imageUrl }) => {
	const classes = useStyles();
	const [fetching, setFetching] = useState(true);
	const [blobUrl, setBlobUrl] = useState("");

	useEffect(() => {
		if (!imageUrl) {
			setFetching(true);
			return;
		}
		const fetchImage = async () => {
			try {
				const { data, headers } = await api.get(imageUrl, {
					responseType: "blob",
				});
				const url = window.URL.createObjectURL(
					new Blob([data], { type: headers["content-type"] })
				);
				setBlobUrl(url);
				setFetching(false);
			} catch (err) {
				console.error("Erro ao carregar imagem:", err);
				setFetching(false);
			}
		};
		fetchImage();
	}, [imageUrl]);

	// Se não tem URL, mostrar placeholder de carregamento
	if (!imageUrl) {
		return (
			<div className={classes.loadingContainer}>
				<CircularProgress size={24} />
				<Typography variant="caption" color="textSecondary">
					🔄 Carregando imagem...
				</Typography>
			</div>
		);
	}

	return (
		<ModalImage
			className={classes.messageMedia}
			smallSrcSet={fetching ? imageUrl : blobUrl}
			medium={fetching ? imageUrl : blobUrl}
			large={fetching ? imageUrl : blobUrl}
			alt="image"
			showRotate={true}
		/>
	);
};

export default ModalImageCors;
