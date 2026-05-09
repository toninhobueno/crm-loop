import React, { useContext } from "react";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";

import MainContainer from "../../components/MainContainer";
import DashboardSectionTabs from "../../components/DashboardSectionTabs";
import MomentsUser from "../../components/MomentsUser";
import ForbiddenPage from "../../components/ForbiddenPage";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: "calc(100vh - 140px)",
    overflow: "hidden",
  },
  momentsWrap: {
    flex: 1,
    overflowY: "auto",
    ...theme.scrollbarStyles,
    padding: theme.spacing(1),
  },
}));

const Painel = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  if (user.profile === "user" && user.allowRealTime === "disabled") {
    return <ForbiddenPage />;
  }

  return (
    <MainContainer>
      <DashboardSectionTabs showFollowup={user.profile === "admin"} />
      <Paper className={classes.mainPaper} variant="outlined">
        <div className={classes.momentsWrap}>
          <MomentsUser />
        </div>
      </Paper>
    </MainContainer>
  );
};

export default Painel;
