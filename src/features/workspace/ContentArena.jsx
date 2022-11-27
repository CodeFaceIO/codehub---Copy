/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { MdBuild } from 'react-icons/md';
import { Button } from '@chakra-ui/react';
import styles from './workspace.module.css';
import files from './files';
import WorkspaceNav from './WorkspaceNav';
import useKeyPress from './hooks/useKeyPress';
import { languageOptions } from './constants/languageOptions';
import { defineTheme } from './lib/defineTheme';
import CodeEditorWindow from './CodeEditorWindow';
import OutputWindow from './OutputWindow';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AiOutlineFileText, AiFillGithub, AiOutlineSearch } from 'react-icons/ai';
import { useMouseDelta } from './hooks/useMouseDelta';
import { FaTimes, FaTerminal } from 'react-icons/fa';
import { VscExtensions } from 'react-icons/vsc';
import { CgCommunity, CgDockBottom } from 'react-icons/cg';
import { TbTemplate } from 'react-icons/tb';
import { RiTeamLine } from 'react-icons/ri';
import {
  VscError,
  VscDebug,
  VscSearch,
  VscAccount,
  VscSettingsGear,
  VscFiles,
  VscGithubInverted,
  VscSourceControl,
  VscTerminalBash,
} from 'react-icons/vsc';
import { MdOutlineErrorOutline, MdSettings } from 'react-icons/md';
import { RiAccountCircleLine } from 'react-icons/ri';
import { BiChevronDown } from 'react-icons/bi';
import { BsLayoutSidebarInset, BsLayoutSidebar } from 'react-icons/bs';
import { TbSquareToggleHorizontal, TbSquareToggle } from 'react-icons/tb';
import TreeView from './TreeView';

const ContentArena = ({ ref, handleThemeChange }) => {
  const sideMenus = [VscSearch, VscFiles, VscGithubInverted, VscSourceControl, VscExtensions, VscDebug];

  const [code, setCode] = useState(files['script.js'].value);
  const [customInput, setCustomInput] = useState('');
  const [outputDetails, setOutputDetails] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [theme, setTheme] = useState('vs-dark');
  const [language, setLanguage] = useState(languageOptions[0]);
  const [sideBar, setSideBar] = useState(true);
  const [console, setConsole] = useState(true);
  const [jsonFile, setJsonFile] = useState(files['configure.json']); // files is an object with all the files
  const [githubRepos, setGithubRepos] = useState([]);
  const renderedSideMenus = sideMenus.map((Icon, index) => {
    return (
      <div
        className={styles.arena_work_workspace_nav_icon}
        key={index}
        onClick={() => {
          setSideBar(!sideBar);
        }}
      >
        <Icon />
      </div>
    );
  });

  const enterPress = useKeyPress('Enter');
  const ctrlPress = useKeyPress('Control');

  const onSelectChange = (sl) => {
    console.log('selected Option...', sl);
    setLanguage(sl);
  };

  useEffect(() => {
    if (enterPress && ctrlPress) {
      console.log('enterPress', enterPress);
      console.log('ctrlPress', ctrlPress);
      handleCompile();
    }
  }, [ctrlPress, enterPress]);

  const handleCompile = () => {
    setProcessing(true);
    const formData = {
      language_id: language.id,
      // encode source code in base64
      source_code: btoa(code),
      stdin: btoa(customInput),
    };

    const options = {
      method: 'POST',
      url: process.env.REACT_APP_RAPID_API_URL,
      params: { base64_encoded: 'true', fields: '*' },
      headers: {
        'content-type': 'application/json',
        'Content-Type': 'application/json',
        'X-RapidAPI-Host': process.env.REACT_APP_RAPID_API_HOST,
        'X-RapidAPI-Key': process.env.REACT_APP_RAPID_API_KEY,
      },
      data: formData,
    };

    axios
      .request(options)
      .then(function (response) {
        console.log('res.data', response.data);
        const token = response.data;
        checkStatus(token);
      })
      .catch((err) => {
        let error = err.response ? err.response.data : err;
        // get error status\
        let status = err.response.status;
        console.log('status', status);
        if (status === 429) {
          console.log('too many requests', status);

          showErrorToast(`Quota of 100 requests exceeded for the Day!`, 10000);
        }
        setProcessing(false);
        console.log('catch block...', error);
      });
  };

  const checkStatus = async (token) => {
    const options = {
      method: 'GET',
      url: process.env.REACT_APP_RAPID_API_URL + '/' + token,
      params: { base64_encoded: 'true', fields: '*' },
      headers: {
        'X-RapidAPI-Host': process.env.REACT_APP_RAPID_API_HOST,
        'X-RapidAPI-Key': process.env.REACT_APP_RAPID_API_KEY,
      },
    };
    try {
      let response = await axios.request(options);
      let statusId = response.data.status?.id;

      // Processed - we have a result
      if (statusId === 1 || statusId === 2) {
        // still processing
        setTimeout(() => {
          checkStatus(token);
        }, 2000);
        return;
      } else {
        setProcessing(false);
        setOutputDetails(response.data);
        showSuccessToast(`Compiled Successfully!`);
        console.log('response.data', response.data);
        return;
      }
    } catch (err) {
      console.log('err', err);
      setProcessing(false);
      showErrorToast();
    }
  };

  const uploadProjectToFileExplorerHandler = (e) => {
    const files = e.target.files;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target.result;
        setJsonFile(fileContent);
      };
      reader.readAsText(file);
    }
  };

  function handleThemeChange(th) {
    const theme = th;
    console.log('theme...', theme);

    if (['light', 'vs-dark'].includes(theme.value)) {
      setTheme(theme);
    } else {
      defineTheme(theme.value).then((_) => setTheme(theme));
    }
  }

  useEffect(() => {
    defineTheme('vs-dark').then((_) => setTheme({ value: 'vs-dark', label: 'vs-dark' }));
    // keep url state before refresh with handleWorkspaceComponentClick prop
  }, []);

  const showSuccessToast = (msg) => {
    toast.success(msg || `Compiled Successfully!`, {
      position: 'top-right',
      autoClose: 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };
  const showErrorToast = (msg, timer) => {
    toast.error(msg || `Something went wrong! Please try again.`, {
      position: 'top-right',
      autoClose: timer ? timer : 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };

  const appUserGithubRepoConnectionHandler = (githubToken) => {
    const options = {
      method: 'GET',
      url: 'https://api.github.com/user/repos',
      headers: {
        Authorization: 'token ' + githubToken,
      },
    };

    axios
      .request(options)
      .then(function (response) {
        console.log('res.data', response.data);
        const repos = response.data;
        setGithubRepos(repos);
      })
      .catch((err) => {
        let error = err.response ? err.response.data : err;
        // get error status
        let status = err.response.status;
        console.log('status', status);
        if (status === 401) {
          console.log('unauthorized', status);
          setGithubRepos(null);
          showErrorToast(`Unauthorized! Please try again.`, 10000);
        }
        console.log('catch block...', error);
      });
  };

  const onChange = (action, data) => {
    switch (action) {
      case 'code': {
        setCode(data);
        break;
      }
      default: {
        console.warn('case not handled!', action, data);
      }
    }
  };

  return (
    <>
      <div
        className={`${
          sideBar && console
            ? styles.arena_container_main
            : sideBar
            ? styles.arena_container_main_3
            : console
            ? styles.arena_container_main_2
            : styles.arena_container_main_4
        }`}
      >
        <div className={`${styles.arena_maxtop} pe-3`}>
          <ul>
            <li>Logo</li>
            <li>File</li>
            <li>Edit</li>
            <li>Selection</li>
            <li>View</li>
            <li>Terminal</li>
            <li>Help</li>
          </ul>
          <div className={`${styles.maxtop_input}`}>
            <input type="search" placeholder="Search in CodeFace" />
            <BiChevronDown />
          </div>
          <div>
            <ul className={`${styles.toggle_panel}`}>
              <li onClick={() => setSideBar(!sideBar)}>
                <TbSquareToggle />
              </li>
              <li onClick={() => setConsole(!console)}>
                <TbSquareToggleHorizontal />
              </li>
            </ul>
          </div>
        </div>
        <div className={`${styles.arena_work_navi}`}>
          <WorkspaceNav />
        </div>
        <div className={`${styles.arena_col}`}>
          <div>{renderedSideMenus}</div>
          <div>
            <VscAccount />
            <VscSettingsGear />
          </div>
        </div>
        <div className={`${styles.arena_side}`}>
          <div className={`${styles.side_absolute}`}></div>
          <TreeView />
        </div>
        <CodeEditorWindow
          code={code}
          onChange={onChange}
          language={language?.value}
          theme={theme.value}
          outputDetails={outputDetails}
          handleCompile={handleCompile}
          processing={processing}
          handleThemeChange={handleThemeChange}
          onSelectChange={onSelectChange}
          themeEditorNav={theme}
        />
        <div className={`${styles.arena_console}`}>
          <div className={`${styles.console_absolute}`}></div>
          <div className={styles.console_controllers}>
            <FaTimes
              onClick={() => {
                setConsole(false);
              }}
            />
          </div>
        </div>
        <div className={`${styles.arena_status_bar}`}>
          <div className={`${styles.status_bar_errors}`}>
            <ul>
              <li>
                <VscError />
              </li>
              <li>
                <MdOutlineErrorOutline />
              </li>
            </ul>
          </div>
          <div className={`${styles.status_bar_line}`}></div>
          <div className={`${styles.status_bar_absolute}`}>
            {!console && (
              <VscTerminalBash
                onClick={() => {
                  setConsole(true);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ContentArena;
