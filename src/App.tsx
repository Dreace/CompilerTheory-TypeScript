import React from "react";
import {BrowserRouter as Router, Link, Switch, Route, Redirect} from "react-router-dom";
import {Menu} from "antd";
import {GithubOutlined} from "@ant-design/icons"
import "./App.scss";
import LexicalComponent from "./pages/Lexical";
import {LL1Component} from "./pages/LL1";

export default class App extends React.Component {
    render() {
        return (
            <Router>
                <div className="header">
                    <Menu mode="horizontal" defaultSelectedKeys={[window.location.pathname]}>
                        <Menu.Item key="/lexical">
                            <Link to="/lexical">词法分析</Link>
                        </Menu.Item>
                        <Menu.Item key="/ll1">
                            <Link to="/ll1">LL(1) 文法分析</Link>
                        </Menu.Item>
                        <Menu.Item icon={<GithubOutlined/>}>
                            <a href={"http://github.com"} target="_blank" rel="noopener noreferrer">
                                Github
                            </a>
                        </Menu.Item>
                    </Menu>
                </div>
                <Switch>
                    <Route exact path="/lexical" component={LexicalComponent}>
                    </Route>
                    <Route path="/ll1" component={LL1Component}>
                    </Route>
                    <Route exact render={() => (
                        <Redirect to="/lexical"/>
                    )}/>
                </Switch>
            </Router>
        )
    }
}

