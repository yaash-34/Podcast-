import { BackupRounded, CloseRounded, CloudDoneRounded } from '@mui/icons-material';
import { CircularProgress, IconButton, LinearProgress, Modal } from "@mui/material";
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL,
} from "firebase/storage";
import app from "../firebase";
import ImageSelector from "./ImageSelector";
import { useDispatch } from "react-redux";
import { openSnackbar } from "../redux/snackbarSlice";
import { createPodcast } from '../api';
import { Category } from '../utils/Data';

const Container = styled.div`
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    background-color: #000000a7;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow-y: scroll;
`;

const Wrapper = styled.div`
    max-width: 500px;
    width: 100%;
    border-radius: 16px;
    margin: 50px 20px;
    height: min-content;
    background-color: ${({ theme }) => theme.card};
    color: ${({ theme }) => theme.text_primary};
    padding: 10px;
    display: flex;
    flex-direction: column;
    position: relative;
`;

const Title = styled.div`
    font-size: 22px;
    font-weight: 500;
    color: ${({ theme }) => theme.text_primary};
    margin: 12px 20px;
`;

const TextInput = styled.input`
    width: 100%;
    border: none;
    font-size: 14px;
    border-radius: 3px;
    background-color: transparent;
    outline: none;
    color: ${({ theme }) => theme.text_secondary};
`;

const Desc = styled.textarea`
    width: 100%;
    border: none;
    font-size: 14px;
    border-radius: 3px;
    background-color: transparent;
    outline: none;
    padding: 10px 0px;
    color: ${({ theme }) => theme.text_secondary};
`;

const Label = styled.div`
    font-size: 16px;
    font-weight: 500;
    color: ${({ theme }) => theme.text_primary};
    margin: 12px 20px 0px 20px;
`;

const OutlinedBox = styled.div`
    min-height: 48px;
    border-radius: 8px;
    border: 1px solid ${({ theme }) => theme.text_secondary};
    color: ${({ theme }) => theme.text_secondary};
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0px 14px;
    margin: 3px 20px;
    font-weight: 600;
    font-size: 16px;
    ${({ button, theme }) =>
        button &&
        `
        cursor: pointer;
        background: ${theme.button};
        color: ${theme.bg};
    `}
    ${({ activeButton, theme }) =>
        activeButton &&
        `
        background: ${theme.primary};
        color: white;
    `}
`;

const Select = styled.select`
    width: 100%;
    border: none;
    font-size: 14px;
    border-radius: 3px;
    background-color: transparent;
    outline: none;
    color: ${({ theme }) => theme.text_secondary};
`;

const Option = styled.option`
    font-size: 14px;
    border-radius: 3px;
    background-color: ${({ theme }) => theme.card};
    outline: none;
    color: ${({ theme }) => theme.text_secondary};
`;

const FileUpload = styled.label`
    display: flex;
    min-height: 48px;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin: 16px 20px 3px 20px;
    border: 1px dashed ${({ theme }) => theme.text_secondary};
    border-radius: 8px;
    padding: 10px;
    cursor: pointer;
    color: ${({ theme }) => theme.text_secondary};
    &:hover {
        background-color: ${({ theme }) => theme.text_secondary + "20"};
    }
`;

const File = styled.input`
    display: none;
`;

const Uploading = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 12px;
`;

const ButtonContainer = styled.div`
    display: flex;
    gap: 0px;
    margin: 6px 20px 20px 20px;
    align-items: center;
    gap: 12px;
`;

const Upload = ({ setUploadOpen }) => {
    const [podcast, setPodcast] = useState({
        name: "",
        desc: "",
        thumbnail: "",
        tags: [],
        category: "",
        type: "audio",
        episodes: [
            {
                name: "",
                desc: "",
                type: "audio",
                file: "",
                uploadProgress: 0,
            }
        ],
    });
    const [showEpisode, setShowEpisode] = useState(false);
    const [disabled, setDisabled] = useState(true);
    const [backDisabled, setBackDisabled] = useState(false);
    const [createDisabled, setCreateDisabled] = useState(true);
    const [loading, setLoading] = useState(false);

    const dispatch = useDispatch();
    const token = localStorage.getItem("podstreamtoken");

    useEffect(() => {
        if (podcast === null) {
            setDisabled(true);
            setPodcast({
                name: "",
                desc: "",
                thumbnail: "",
                tags: [],
                episodes: [
                    {
                        name: "",
                        desc: "",
                        type: "audio",
                        file: "",
                        uploadProgress: 0,
                    }
                ],
            });
        } else {
            if (podcast.name === "" && podcast.desc === "") {
                setDisabled(true);
            } else {
                setDisabled(false);
            }
        }
    }, [podcast]);

    const uploadFile = (file, index) => {
        const storage = getStorage(app);
        const fileName = new Date().getTime() + file.name;
        const storageRef = ref(storage, fileName);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            "state_changed",
            (snapshot) => {
                const progress =
                    (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                const newEpisodes = [...podcast.episodes];
                newEpisodes[index].uploadProgress = Math.round(progress);
                setPodcast(prevState => ({
                    ...prevState,
                    episodes: newEpisodes
                }));
            },
            (error) => {
                console.error("Upload failed:", error);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    console.log("File available at:", downloadURL);
                    const newEpisodes = [...podcast.episodes];
                    newEpisodes[index].file = downloadURL;
                    setPodcast(prevState => ({
                        ...prevState,
                        episodes: newEpisodes
                    }));
                });
            }
        );
    };

    const createPodcastHandler = async () => {
        setLoading(true);
        try {
            const response = await createPodcast(podcast, token);
            console.log(response);
            setDisabled(true);
            setBackDisabled(true);
            setUploadOpen(false);
            dispatch(
                openSnackbar({
                    open: true,
                    message: "Podcast created successfully",
                    severity: "success",
                })
            );
        } catch (error) {
            console.error(error);
            setDisabled(false);
            setBackDisabled(false);
            setLoading(false);
            dispatch(
                openSnackbar({
                    open: true,
                    message: "Error creating podcast",
                    severity: "error",
                })
            );
        }
    };

    useEffect(() => {
        const isPodcastValid = () => {
            return (
                podcast.episodes.length > 0 &&
                podcast.episodes.every(
                    episode => episode.file !== "" &&
                        episode.name !== "" &&
                        episode.desc !== ""
                ) &&
                podcast.name !== "" &&
                podcast.desc !== "" &&
                podcast.tags.length > 0 &&
                podcast.thumbnail !== ""
            );
        };

        setCreateDisabled(!isPodcastValid());
    }, [podcast]);

    const handleBackToPodcastDetails = () => {
        setShowEpisode(false);
    };

    const handleNextToEpisodeDetails = () => {
        if (!disabled) {
            setShowEpisode(true);
        }
    };

    return (
        <Modal open={true} onClose={() => setUploadOpen(false)}>
            <Container>
                <Wrapper>
                    <CloseRounded
                        style={{
                            position: "absolute",
                            top: "24px",
                            right: "30px",
                            cursor: "pointer",
                        }}

onClick={() => setUploadOpen(false)}
/>
<Title>Upload Podcast</Title>
{!showEpisode ? (
    <>
        <Label>Podcast Details:</Label>

        <ImageSelector podcast={podcast} setPodcast={setPodcast} />
        <OutlinedBox style={{ marginTop: "12px" }}>
            <TextInput
                placeholder="Podcast Name*"
                type="text"
                value={podcast?.name}
                onChange={(e) => setPodcast({ ...podcast, name: e.target.value })}
            />
        </OutlinedBox>
        <OutlinedBox style={{ marginTop: "6px" }}>
            <Desc
                placeholder="Podcast Description* "
                name="desc"
                rows={5}
                value={podcast?.desc}
                onChange={(e) => setPodcast({ ...podcast, desc: e.target.value })}
            />
        </OutlinedBox>
        <OutlinedBox style={{ marginTop: "6px" }}>
            <Desc
                placeholder="Tags separated by comma"
                name="tags"
                rows={4}
                value={podcast?.tags.join(",")}
                onChange={(e) => setPodcast({ ...podcast, tags: e.target.value.split(",") })}
            />
        </OutlinedBox>
        <div style={{ display: 'flex', gap: '0px', width: '100%', gap: '6px' }}>
            <OutlinedBox style={{ marginTop: "6px", width: '100%', marginRight: '0px' }}>
                <Select
                    onChange={(e) => setPodcast({ ...podcast, type: e.target.value })}
                >
                    <Option value="audio">Audio</Option>
                    <Option value="video">Video</Option>
                </Select>
            </OutlinedBox>
            <OutlinedBox style={{ marginTop: "6px", width: '100%', marginLeft: '0px' }}>
                <Select
                    defaultValue=""
                    onChange={(e) => setPodcast({ ...podcast, category: e.target.value })}
                >
                    <Option disabled hidden>Select Category</Option>
                    {Category.map((category) => (
                        <Option key={category.name} value={category.name}>{category.name}</Option>
                    ))}
                </Select>
            </OutlinedBox>
        </div>
        <OutlinedBox
            button={true}
            activeButton={!disabled}
            style={{ marginTop: "22px", marginBottom: "18px" }}
            onClick={handleNextToEpisodeDetails}
        >
            Next
        </OutlinedBox>
    </>
) : (
    <>
        <Label>Episode Details:</Label>
        {podcast.episodes.map((episode, index) => (
            <div key={index}>
                <FileUpload htmlFor={"fileField" + index}>
                    {episode.file === "" ? (
                        <Uploading>
                            <BackupRounded />
                            Select Audio / Video
                        </Uploading>
                    ) : (
                        <Uploading>
                            {episode.file.name === undefined ? (
                                <div style={{ color: 'green', display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                                    <CloudDoneRounded sx={{ color: 'inherit' }} />
                                    File Uploaded Successfully
                                </div>
                            ) : (
                                <>
                                    File: {episode.file.name}
                                    <LinearProgress
                                        sx={{ borderRadius: "10px", height: 3, width: "100%" }}
                                        variant="determinate"
                                        value={episode.uploadProgress}
                                        color={"success"}
                                    />
                                    {episode.uploadProgress}% Uploaded
                                </>
                            )}
                        </Uploading>
                    )}
                </FileUpload>
                <File
                    style={{ marginTop: "16px" }}
                    type="file"
                    accept="audio/*,video/*"
                    id={"fileField" + index}
                    onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const newEpisodes = [...podcast.episodes];
                            newEpisodes[index].file = file;
                            setPodcast({ ...podcast, episodes: newEpisodes });
                            uploadFile(file, index);
                        }
                    }}
                />
                <OutlinedBox style={{ marginTop: "6px" }}>
                    <TextInput
                        placeholder="Episode Name*"
                        type="text"
                        value={episode.name}
                        onChange={(e) => {
                            const newEpisodes = [...podcast.episodes];
                            newEpisodes[index].name = e.target.value;
                            setPodcast({ ...podcast, episodes: newEpisodes });
                        }}
                    />
                </OutlinedBox>
                <OutlinedBox style={{ marginTop: "6px" }}>
                    <Desc
                        placeholder="Episode Description* "
                        name="desc"
                        rows={5}
                        value={episode.desc}
                        onChange={(e) => {
                            const newEpisodes = [...podcast.episodes];
                            newEpisodes[index].desc = e.target.value;
                            setPodcast({ ...podcast, episodes: newEpisodes });
                        }}
                    />
                </OutlinedBox>
                <OutlinedBox
                    button={true}
                    activeButton={false}
                    style={{ marginTop: "6px", marginBottom: "12px" }}
                    onClick={() => {
                        const newEpisodes = podcast.episodes.filter((_, i) => i !== index);
                        setPodcast({ ...podcast, episodes: newEpisodes });
                    }}
                >
                    Delete
                </OutlinedBox>
            </div>
        ))}
        <OutlinedBox
            button={true}
            activeButton={true}
            style={{ marginTop: "4px", marginBottom: "18px" }}
            onClick={() => {
                const newEpisode = {
                    name: "",
                    desc: "",
                    type: "audio",
                    file: "",
                    uploadProgress: 0,
                };
                setPodcast({ ...podcast, episodes: [...podcast.episodes, newEpisode] });
            }}
        >
            Add Episode
        </OutlinedBox>

        <ButtonContainer>
            <OutlinedBox
                button={true}
                activeButton={true}
                style={{ marginTop: "6px", width: "100%", margin: 0 }}
                onClick={handleBackToPodcastDetails}
            >
                Back
            </OutlinedBox>
            <OutlinedBox
                button={true}
                activeButton={!createDisabled}
                style={{ marginTop: "6px", width: "100%", margin: 0 }}
                onClick={createPodcastHandler}
            >
                {loading ? (
                    <CircularProgress color="inherit" size={20} />
                ) : (
                    "Create"
                )}
            </OutlinedBox>
        </ButtonContainer>
    </>
)}
</Wrapper>
</Container>
</Modal>
);
};

export default Upload;